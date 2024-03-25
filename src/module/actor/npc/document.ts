import { CreaturePF2e } from "@actor";
import type { Abilities } from "@actor/creature/data.ts";
import { setHitPointsRollOptions, strikeFromMeleeItem } from "@actor/helpers.ts";
import { ActorInitiative } from "@actor/initiative.ts";
import { ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import type { AttributeString, SaveType } from "@actor/types.ts";
import { SAVE_TYPES, SKILL_DICTIONARY_REVERSE, SKILL_EXPANDED, SKILL_LONG_FORMS } from "@actor/values.ts";
import type { ItemPF2e, LorePF2e, MeleePF2e } from "@item";
import type { ItemType } from "@item/base/data/index.ts";
import { calculateDC } from "@module/dc.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { CreatureIdentificationData, creatureIdentificationDCs } from "@module/recall-knowledge.ts";
import { extractModifierAdjustments, extractModifiers } from "@module/rules/helpers.ts";
import type { TokenDocumentPF2e } from "@scene";
import { ArmorStatistic, PerceptionStatistic, Statistic } from "@system/statistic/index.ts";
import { createHTMLElement, objectHasKey, signedInteger, sluggify } from "@util";
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
    override canUserModify(user: User, action: UserAction): boolean {
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

        // Ensure undead have negative healing
        attributes.hp.negativeHealing = this.system.traits.value.includes("undead");

        // Exclude troops from being flankable
        attributes.flanking.flankable = !this.system.traits.value.includes("troop");

        // NPC level needs to be known before the rest of the weak/elite adjustments
        const level = details.level;
        level.base = Math.clamped(level.value, -1, 100);
        level.value = this.isElite ? level.base + 1 : this.isWeak ? level.base - 1 : level.base;
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
        this.system.resources.focus = fu.mergeObject({ value: 0, max: 0, cap: 3 }, this.system.resources.focus);
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
                    new ModifierPF2e(
                        "PF2E.NPC.Adjustment.EliteLabel",
                        this.getHpAdjustment(baseLevel, "elite"),
                        "untyped",
                    ),
            );
        } else if (this.isWeak) {
            modifierAdjustments.all.push({
                slug: "base",
                getNewValue: (base: number) => base - 2,
                test: () => true,
            });
            synthetics.modifiers.hp.push(
                () =>
                    new ModifierPF2e(
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
            const modifiers: ModifierPF2e[] = [
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

        // Speeds
        const speeds = (system.attributes.speed = this.prepareSpeed("land"));
        speeds.otherSpeeds = (["burrow", "climb", "fly", "swim"] as const).flatMap((m) => this.prepareSpeed(m) ?? []);

        // Armor Class
        const armorStatistic = new ArmorStatistic(this, {
            modifiers: [
                new ModifierPF2e({
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
                    new ModifierPF2e({
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

        this.skills = this.prepareSkills();
        type GappyLoreItems = Partial<Record<string, LorePF2e<this>>>;
        const loreItems: GappyLoreItems = R.mapToObj(this.itemTypes.lore, (l) => [sluggify(l.name), l]);
        this.system.skills = R.mapToObj(Object.values(this.skills), (statistic) => [
            objectHasKey(SKILL_DICTIONARY_REVERSE, statistic.slug)
                ? SKILL_DICTIONARY_REVERSE[statistic.slug]
                : statistic.slug,
            {
                ...statistic.getTraceData(),
                base: loreItems[statistic.slug]?.system.mod.value ?? 0,
                itemId: loreItems[statistic.slug]?.id ?? null,
                lore: !!statistic.lore,
                mod: statistic.check.mod,
                variants: Object.values(loreItems[statistic.slug]?.system.variants ?? {}),
                visible: statistic.proficient,
            },
        ]);

        // Process strikes
        const syntheticWeapons = R.uniqBy(R.compact(synthetics.strikes.map((s) => s())), (w) => w.slug);
        const generatedMelee = syntheticWeapons.flatMap((w) => w.toNPCAttacks({ keepId: true }));
        const meleeItems = R.sortBy(
            [this.itemTypes.melee, generatedMelee].flat(),
            (m) => m.name,
            (m) => m.sort,
        );
        for (const item of meleeItems) {
            system.actions.push(strikeFromMeleeItem(item));
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
                    new ModifierPF2e({
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

    private prepareSkills(): Record<string, Statistic<this>> {
        const modifierAdjustments = this.synthetics.modifierAdjustments;

        const trainedSkills = R.mapToObj(this.itemTypes.lore, (s) => [sluggify(s.name), s]);
        const coreSkillSlugs = Array.from(SKILL_LONG_FORMS);
        const skillOrNull = {
            ...R.mapToObj(coreSkillSlugs, (s) => [s, trainedSkills[s] ?? null]),
            ...R.omit(trainedSkills, coreSkillSlugs),
        };
        const slugToAttribute: Record<string, { attribute: AttributeString }> = SKILL_EXPANDED;

        return R.mapValues(skillOrNull, (item, slug) => {
            const { label, attribute, lore } =
                slug in slugToAttribute
                    ? { label: CONFIG.PF2E.skillList[slug], attribute: slugToAttribute[slug].attribute, lore: false }
                    : { label: item?.name ?? "", attribute: "int" as const, lore: true };

            const domains = [slug, `${attribute}-based`, "skill-check", `${attribute}-skill-check`, "all"];

            return new Statistic(this, {
                slug,
                label,
                attribute,
                domains,
                modifiers: [
                    new ModifierPF2e({
                        slug: "base",
                        label: "PF2E.ModifierTitle",
                        modifier: item?.system.mod.value ?? this.system.abilities[attribute].mod,
                        adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                    }),
                ],
                lore,
                proficient: !!item,
                check: { type: "skill-check" },
            });
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
                button.innerHTML = game.i18n.localize("PF2E.ConsumableUseLabel");
                return `${item.name} - ${game.i18n.localize("TYPES.Item.consumable")} (${item.quantity}) ${
                    button.outerHTML
                }`;
            }
            return item.name;
        };
        const formatNoteText = (item: ItemPF2e<this | null>): Promise<string> => {
            // Call enrichHTML with the correct item context
            const rollData = item.getRollData();
            return TextEditor.enrichHTML(item.description, { rollData, async: true });
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
}

interface NPCPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends CreaturePF2e<TParent> {
    flags: NPCFlags;
    readonly _source: NPCSource;
    system: NPCSystemData;
}

export { NPCPF2e };
