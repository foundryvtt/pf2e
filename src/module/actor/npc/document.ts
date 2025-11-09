import { CreaturePF2e } from "@actor";
import type { Abilities } from "@actor/creature/data.ts";
import type { CreatureUpdateCallbackOptions } from "@actor/creature/index.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { attackFromMeleeItem, setHitPointsRollOptions } from "@actor/helpers.ts";
import { ActorInitiative } from "@actor/initiative.ts";
import { Modifier, StatisticModifier } from "@actor/modifiers.ts";
import type { MovementType, SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import type { UserAction } from "@common/constants.d.mts";
import type { ItemPF2e, MeleePF2e } from "@item";
import type { ItemType } from "@item/types.ts";
import { calculateDC } from "@module/dc.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { CreatureIdentificationData, creatureIdentificationDCs } from "@module/recall-knowledge.ts";
import { extractModifierAdjustments, extractModifiers } from "@module/rules/helpers.ts";
import type { TokenDocumentPF2e } from "@scene";
import { ArmorStatistic, PerceptionStatistic, Statistic } from "@system/statistic/index.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { createHTMLElement, signedInteger, sluggify } from "@util";
import * as R from "remeda";
import type { NPCFlags, NPCSource, NPCSystemData } from "./data.ts";
import type { VariantCloneParams } from "./types.ts";

class NPCPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends CreaturePF2e<TParent> {
    declare initiative: ActorInitiative;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "physical", "spellcastingEntry", "spell", "action", "melee", "lore"];
    }

    /** The level of this creature without elite/weak adjustments */
    get baseLevel(): number {
        return this._source.system.details.level.value;
    }

    /** This NPC's attribute modifiers */
    override get abilities(): Abilities {
        return fu.deepClone(this.system.abilities);
    }

    get description(): string {
        return this.system.details.publicNotes;
    }

    /** Does this NPC have the Elite adjustment? */
    get isElite(): boolean {
        return this.attributes.adjustment === "elite";
    }

    /** Does this NPC have the Weak adjustment? */
    get isWeak(): boolean {
        return this.attributes.adjustment === "weak";
    }

    get identificationDCs(): CreatureIdentificationData {
        const pwol = game.pf2e.settings.variants.pwol.enabled;
        return creatureIdentificationDCs(this, { pwol });
    }

    /** A user can see an unlinked NPC in the actor directory only if they have at least Observer permission */
    override get visible(): boolean {
        return (
            (super.visible && this.prototypeToken.actorLink) ||
            this.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
        );
    }

    /** Non-owning users may be able to loot a dead NPC. */
    override canUserModify(user: fd.BaseUser, action: UserAction): boolean {
        return (
            super.canUserModify(user, action) ||
            (action === "update" &&
                this.isDead &&
                (this.flags.pf2e.lootable || game.settings.get("pf2e", "automation.lootableNPCs")))
        );
    }

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.flags.pf2e.lootable ??= false;
        this.system.actions = [];
        for (const key of SAVE_TYPES) {
            this.system.saves[key].attribute = CONFIG.PF2E.savingThrowDefaultAttributes[key];
        }
        const { attributes, details } = this.system;
        if (details.alliance === undefined) {
            details.alliance = this.hasPlayerOwner ? "party" : "opposition";
        }

        // Ensure undead have void healing
        attributes.hp.negativeHealing = this.system.traits.value.includes("undead");

        // Exclude troops from being flankable
        attributes.flanking.flankable = !this.system.traits.value.includes("troop");

        // NPC level needs to be known before the rest of the weak/elite adjustments
        const level = details.level;
        level.base = Math.clamp(level.value, -1, 100);

        // Elite: Increase the creature's level by 1; if the creature is -1 or 0, instead increase its level by 2
        // Weak : Decrease the creature's level by 1; if the creature is level 1, instead decrease its level by 2
        level.value = this.isElite
            ? level.base < 1
                ? level.base + 2
                : level.base + 1
            : this.isWeak
              ? level.base === 1
                  ? level.base - 2
                  : level.base - 1
              : level.base;
        this.rollOptions.all[`self:level:${level.value}`] = true;

        attributes.spellDC = null;
        attributes.classDC = ((): { value: number } => {
            const pwol = game.pf2e.settings.variants.pwol.enabled;
            const levelBasedDC = calculateDC(level.base, { pwol, rarity: this.rarity });
            const adjusted = this.isElite ? levelBasedDC + 2 : this.isWeak ? levelBasedDC - 2 : levelBasedDC;
            return { value: adjusted };
        })();
        attributes.classOrSpellDC = { value: attributes.classDC.value };
        this.system.spellcasting = fu.mergeObject({ rituals: { dc: 0 } }, this.system.spellcasting);

        const resources = this.system.resources;
        resources.focus = fu.mergeObject({ value: 0, max: 0, cap: 3 }, resources.focus);
        resources.mythicPoints = {
            value: resources.mythicPoints?.value ?? 3,
            max: this.system.traits.value.includes("mythic") ? 3 : 0,
        };

        // Base movement data
        const speeds: Record<MovementType, { value: number; base: number } | null> = this.system.movement.speeds;
        const sourceSpeeds = this._source.system.attributes.speed;
        speeds.land = { value: sourceSpeeds.value, base: sourceSpeeds.value };
        const otherSpeeds = sourceSpeeds.otherSpeeds;
        for (const speed of otherSpeeds) {
            speeds[speed.type] = { value: speed.value, base: speed.value };
        }
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const { system, synthetics } = this;
        const modifierAdjustments = synthetics.modifierAdjustments;
        const baseLevel = system.details.level.base;
        synthetics.modifiers.hp ??= [];

        if (this.isElite) {
            modifierAdjustments.all.push({
                slug: "base",
                getNewValue: (base: number) => base + 2,
                test: () => true,
            });
            synthetics.modifiers.hp.push(
                () =>
                    new Modifier("PF2E.NPC.Adjustment.EliteLabel", this.getHpAdjustment(baseLevel, "elite"), "untyped"),
            );
        } else if (this.isWeak) {
            modifierAdjustments.all.push({
                slug: "base",
                getNewValue: (base: number) => base - 2,
                test: () => true,
            });
            synthetics.modifiers.hp.push(
                () =>
                    new Modifier(
                        "PF2E.NPC.Adjustment.WeakLabel",
                        this.getHpAdjustment(baseLevel, "weak") * -1,
                        "untyped",
                    ),
            );
        }
        system.details.level.base = baseLevel;

        for (const attribute of Object.values(system.abilities)) {
            attribute.mod = Math.trunc(Number(attribute.mod)) || 0;
        }

        // Hit Points
        {
            const base = system.attributes.hp.max;
            const modifiers: Modifier[] = [
                extractModifiers(synthetics, ["hp"], { test: this.getRollOptions(["hp"]) }),
                extractModifiers(synthetics, ["hp-per-level"], {
                    test: this.getRollOptions(["hp-per-level"]),
                }).map((modifier) => {
                    modifier.modifier *= this.level;
                    return modifier;
                }),
            ].flat();

            const hpData = fu.deepClone(system.attributes.hp);
            const stat = fu.mergeObject(new StatisticModifier("hp", modifiers), hpData, { overwrite: false });

            stat.base = base;
            stat.max = stat.max + stat.totalModifier;
            stat.value = Math.min(stat.value, stat.max); // Make sure the current HP isn't higher than the max HP
            stat.breakdown = [
                game.i18n.format("PF2E.MaxHitPointsBaseLabel", { base }),
                ...stat.modifiers.filter((m) => m.enabled).map((m) => `${m.label} ${signedInteger(m.modifier)}`),
            ].join(", ");
            system.attributes.hp = stat;
            setHitPointsRollOptions(this);
        }

        this.prepareMovementData();

        // Armor Class
        const armorStatistic = new ArmorStatistic(this, {
            modifiers: [
                new Modifier({
                    slug: "base",
                    label: "PF2E.ModifierTitle",
                    modifier: system.attributes.ac.value - 10,
                    adjustments: extractModifierAdjustments(modifierAdjustments, ["all", "ac", "dex-based"], "base"),
                }),
            ],
            details: system.attributes.ac.details,
        });
        this.armorClass = armorStatistic.dc;
        system.attributes.ac = fu.mergeObject(armorStatistic.getTraceData(), {
            attribute: armorStatistic.attribute ?? "dex",
        });

        this.prepareSaves();

        // Perception
        {
            const domains = ["perception", "wis-based", "all"];
            this.perception = new PerceptionStatistic(this, {
                slug: "perception",
                label: "PF2E.PerceptionLabel",
                attribute: "wis",
                domains,
                modifiers: [
                    new Modifier({
                        slug: "base",
                        label: "PF2E.ModifierTitle",
                        modifier: system.perception.mod,
                        adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                    }),
                ],
                check: { type: "perception-check" },
                senses: system.perception.senses,
                vision: system.perception.vision,
            });
            system.perception = fu.mergeObject(this.perception.getTraceData(), {
                attribute: this.perception.attribute ?? "wis",
                details: system.perception.details,
                mod: this.perception.mod,
            });
        }

        this.prepareSkills();

        // Process strikes
        const syntheticWeapons = Object.values(synthetics.strikes)
            .map((s) => s())
            .filter(R.isNonNull);
        const generatedMelee = syntheticWeapons.flatMap((w) => w.toNPCAttacks({ keepId: true }));
        const meleeItems = R.sortBy(
            [this.itemTypes.melee, generatedMelee].flat(),
            (m) => (m.system.action === "strike" ? 0 : 1),
            (m) => m.name,
            (m) => m.sort,
        );
        for (const item of meleeItems) {
            system.actions.push(attackFromMeleeItem(item));
        }

        // Initiative
        this.initiative = new ActorInitiative(this, R.pick(system.initiative, ["statistic", "tiebreakPriority"]));
        system.initiative = this.initiative.getTraceData();
    }

    private prepareSaves(): void {
        const system = this.system;
        const modifierAdjustments = this.synthetics.modifierAdjustments;

        // Saving Throws
        const saves: Partial<Record<SaveType, Statistic>> = {};
        for (const saveType of SAVE_TYPES) {
            const save = system.saves[saveType];
            const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const base = save.value;
            const attribute = save.attribute;
            const domains = [saveType, `${attribute}-based`, "saving-throw", "all"];

            const statistic = new Statistic(this, {
                slug: saveType,
                label: saveName,
                domains: domains,
                modifiers: [
                    new Modifier({
                        slug: "base",
                        label: "PF2E.ModifierTitle",
                        modifier: base,
                        adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                    }),
                ],
                check: {
                    type: "saving-throw",
                },
            });

            saves[saveType] = statistic;
            fu.mergeObject(this.system.saves[saveType], statistic.getTraceData());
            system.saves[saveType].base = base;
        }

        this.saves = saves as Record<SaveType, Statistic>;
    }

    private prepareSkills() {
        const modifierAdjustments = this.synthetics.modifierAdjustments;

        this.skills = R.mapToObj(R.entries(CONFIG.PF2E.skills), ([skillSlug, { attribute, label }]) => {
            const skill = this._source.system.skills[skillSlug];
            const domains = [skillSlug, `${attribute}-based`, "skill-check", `${attribute}-skill-check`, "all"];

            // Get predicated variants as modifiers that trigger when the predicate is met.
            // This is only necessary if there are predicates. Direct clicking is handled separately.
            const specialModifiers =
                skill?.special
                    ?.filter((v) => v.predicate?.length)
                    .map(
                        (special) =>
                            new Modifier({
                                slug: "variant",
                                label: special.label,
                                modifier: special.base - skill.base,
                                predicate: special.predicate,
                                hideIfDisabled: true,
                                domains,
                            }),
                    ) ?? [];

            const statistic = new Statistic(this, {
                slug: skillSlug,
                label,
                attribute,
                domains,
                modifiers: [
                    new Modifier({
                        slug: "base",
                        label: "PF2E.ModifierTitle",
                        modifier: skill?.base ?? this.system.abilities[attribute].mod,
                        adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                    }),
                    ...specialModifiers,
                ],
                lore: false,
                proficient: skillSlug in this._source.system.skills,
                check: { type: "skill-check" },
            });

            return [skillSlug, statistic];
        });

        // Assemble lore items, key'd by a normalized slug
        const loreItems = R.mapToObj(this.itemTypes.lore, (loreItem) => [loreItem.slug, loreItem]);

        // Add Lore skills to skill statistics
        for (const [slug, loreItem] of Object.entries(loreItems)) {
            const domains = [slug, "skill-check", "lore-skill-check", "int-skill-check", "all"];
            const statistic = new Statistic(this, {
                slug,
                label: loreItem.name,
                attribute: "int",
                domains,
                modifiers: [
                    new Modifier({
                        slug: "base",
                        label: "PF2E.ModifierTitle",
                        modifier: loreItem.system.mod.value,
                        adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                    }),
                ],
                lore: true,
                proficient: true,
                check: { type: "skill-check" },
            });

            this.skills[slug] = statistic;
        }

        // Create trace data in system data and omit unprepared skills
        this.system.skills = R.mapToObj(Object.entries(this.skills), ([key, statistic]) => {
            const loreItem = statistic.lore ? loreItems[statistic.slug] : null;
            const baseData = this.system.skills[key] ?? { base: loreItem?.system.mod.value ?? 0 };
            const data = fu.mergeObject(baseData, {
                ...statistic.getTraceData(),
                mod: statistic.check.mod,
                itemId: loreItem?.id ?? null,
                lore: !!statistic.lore,
                visible: statistic.proficient,
            });

            // Recalculate displayed variant modifiers, accounting for already enabled ones
            const enabledVariantMod =
                statistic.check.modifiers.find((m) => m.slug === "variant" && m.enabled)?.modifier ?? 0;
            data.special ??= [];
            for (const variant of data.special) {
                variant.mod = variant.base + (statistic.check.mod - baseData.base - enabledVariantMod);
            }

            return [key, data];
        });
    }

    async getAttackEffects(attack: MeleePF2e): Promise<RollNotePF2e[]> {
        const notes: RollNotePF2e[] = [];
        if (attack.description) {
            notes.push(
                new RollNotePF2e({
                    selector: "all",
                    visibility: "gm",
                    text: attack.description,
                }),
            );
        }
        const formatItemName = (item: ItemPF2e<this | null>): string => {
            if (item.isOfType("consumable")) {
                const button = createHTMLElement("button", { dataset: { action: "consume", item: item.id } });
                button.style.width = "auto";
                button.style.lineHeight = "14px";
                button.innerHTML = game.i18n.localize("PF2E.Item.Consumable.Uses.Use");
                return `${item.name} - ${game.i18n.localize("TYPES.Item.consumable")} (${item.quantity}) ${
                    button.outerHTML
                }`;
            }
            return item.name;
        };
        const formatNoteText = (item: ItemPF2e<this | null>): Promise<string> => {
            // Call enrichHTML with the correct item context
            const rollData = item.getRollData();
            return TextEditorPF2e.enrichHTML(item.description, { rollData });
        };

        for (const attackEffect of attack.attackEffects) {
            const item = this.items.find(
                (i) => i.type !== "melee" && (i.slug ?? sluggify(i.name)) === sluggify(attackEffect),
            );
            if (item) {
                // Get description from the actor item.
                const note = new RollNotePF2e({
                    selector: "all",
                    visibility: "gm",
                    title: formatItemName(item),
                    text: await formatNoteText(item),
                });
                notes.push(note);
            } else {
                // Get description from the bestiary glossary compendium.
                const compendium = game.packs.get("pf2e.bestiary-ability-glossary-srd", { strict: true });
                const packItem = (await compendium.getDocuments({ system: { slug: attackEffect } }))[0];
                if (packItem instanceof Item) {
                    const note = new RollNotePF2e({
                        selector: "all",
                        visibility: "gm",
                        title: formatItemName(packItem),
                        text: await formatNoteText(packItem),
                    });
                    notes.push(note);
                }
            }
        }

        return notes;
    }

    private getHpAdjustment(level: number, adjustment: "elite" | "weak" | null): number {
        if (adjustment === "elite") {
            // Elite adjustment: Increase/decrease the creature's Hit Points based on its starting level (20+ 30HP, 5~19 20HP, 2~4 15HP, 1 or lower 10HP).
            if (level >= 20) {
                return 30;
            } else if (level <= 19 && level >= 5) {
                return 20;
            } else if (level <= 4 && level >= 2) {
                return 15;
            } else if (level <= 1) {
                return 10;
            }
        } else if (adjustment === "weak") {
            // Weak adjustment: Increase/decrease the creature's Hit Points based on its starting level (21+ -30HP, 6~20 -20HP, 3~5 -15HP, 1-2 -10HP).
            if (level >= 21) {
                return 30;
            } else if (level <= 20 && level >= 6) {
                return 20;
            } else if (level <= 5 && level >= 3) {
                return 15;
            } else if (level === 1 || level === 2) {
                return 10;
            }
        }
        return 0;
    }

    /** Make the NPC elite, weak, or normal */
    async applyAdjustment(adjustment: "elite" | "weak" | null): Promise<void> {
        const { isElite, isWeak } = this;
        if (
            (isElite && adjustment === "elite") ||
            (isWeak && adjustment === "weak") ||
            (!isElite && !isWeak && !adjustment)
        ) {
            return;
        }

        const currentHPAdjustment = (() => {
            if (isElite) {
                return this.getHpAdjustment(this.baseLevel, "elite");
            } else if (isWeak) {
                return this.getHpAdjustment(this.baseLevel, "weak");
            } else {
                return 0;
            }
        })();
        const newHPAdjustment = this.getHpAdjustment(this.baseLevel, adjustment);
        const currentHP = this.system.attributes.hp.value;
        const maxHP = this.system.attributes.hp.max;
        const newHP = (() => {
            if (isElite) {
                if (adjustment === "weak") {
                    return currentHP - currentHPAdjustment - newHPAdjustment;
                } else if (!adjustment) {
                    return currentHP - currentHPAdjustment;
                }
            } else if (isWeak) {
                if (adjustment === "elite") {
                    this.system.attributes.hp.max = maxHP + currentHPAdjustment + newHPAdjustment; // Set max hp to allow update of current hp > max
                    return currentHP + currentHPAdjustment + newHPAdjustment;
                } else if (!adjustment) {
                    this.system.attributes.hp.max = maxHP + currentHPAdjustment;
                    return currentHP + currentHPAdjustment;
                }
            } else {
                if (adjustment === "elite") {
                    this.system.attributes.hp.max = currentHP + newHPAdjustment;
                    return currentHP + newHPAdjustment;
                } else if (adjustment === "weak") {
                    return currentHP - newHPAdjustment;
                }
            }
            return currentHP;
        })();

        await this.update({
            "system.attributes.hp.value": Math.max(0, newHP),
            "system.attributes.adjustment": adjustment,
        });
    }

    /** Create a variant clone of this NPC, adjusting any of name, description, and images */
    variantClone(params: VariantCloneParams & { save?: false }): this;
    variantClone(params: VariantCloneParams & { save: true }): Promise<this>;
    variantClone(params: VariantCloneParams): this | Promise<this>;
    variantClone(params: VariantCloneParams): this | Promise<this> {
        const source = this._source;
        const changes: DeepPartial<NPCSource> = {
            name: params.name ?? this.name,
            system: {
                details: { publicNotes: params.description ?? source.system.details.publicNotes },
            },
            img: params.img?.actor ?? source.img,
            prototypeToken: {
                texture: {
                    src: params.img?.token ?? source.prototypeToken.texture.src,
                },
            },
        };

        return this.clone(changes, { save: params.save, keepId: params.keepId });
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: CreatureUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        const result = await super._preUpdate(changed, options, user);
        const isFullReplace = !((options.diff ?? true) && (options.recursive ?? true));
        if (isFullReplace || result === false || !changed.system) return result;

        this.#updatePrototypeToken(changed);

        if (changed.system.skills) {
            for (const [key, skill] of Object.entries(changed.system.skills)) {
                if (key.startsWith("-=") || !skill) continue;

                if (skill.note === "") {
                    delete skill.note;
                    fu.mergeObject(skill, { "-=note": null });
                }
            }
        }
    }

    /** Update the prototype token dimensions along with this actor's size category. */
    async #updatePrototypeToken(changes: DeepPartial<this["_source"]>): Promise<void> {
        if (this.isToken || !this.prototypeToken.flags.pf2e.linkToActorSize || !changes.system?.traits?.size?.value) {
            return;
        }
        const newSize = new ActorSizePF2e({ value: changes.system.traits.size.value });
        const currentSize = this.system.traits.size;
        if (newSize.wide !== currentSize.wide || newSize.long !== currentSize.long) {
            const prototypeToken = (changes.prototypeToken ??= {});
            prototypeToken.width = newSize.wide / 5;
            prototypeToken.height = newSize.long / 5;
        }
    }
}

interface NPCPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends CreaturePF2e<TParent> {
    flags: NPCFlags;
    readonly _source: NPCSource;
    system: NPCSystemData;
}

export { NPCPF2e };
