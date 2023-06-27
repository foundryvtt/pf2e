import { CreaturePF2e } from "@actor";
import { Abilities, CreatureSkills } from "@actor/creature/data.ts";
import { SIZE_TO_REACH } from "@actor/creature/values.ts";
import { strikeFromMeleeItem } from "@actor/helpers.ts";
import { ActorInitiative } from "@actor/initiative.ts";
import { ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { AbilityString, SaveType } from "@actor/types.ts";
import { SAVE_TYPES, SKILL_DICTIONARY, SKILL_EXPANDED, SKILL_LONG_FORMS } from "@actor/values.ts";
import { ItemPF2e, LorePF2e, MeleePF2e } from "@item";
import { ItemType } from "@item/data/index.ts";
import { calculateDC } from "@module/dc.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { CreatureIdentificationData, creatureIdentificationDCs } from "@module/recall-knowledge.ts";
import { extractModifierAdjustments, extractModifiers } from "@module/rules/helpers.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { ArmorStatistic } from "@system/statistic/armor-class.ts";
import { Statistic } from "@system/statistic/index.ts";
import { createHTMLElement, objectHasKey, sluggify } from "@util";
import { NPCFlags, NPCSource, NPCSystemData } from "./data.ts";
import { AbstractNPCSheet } from "./sheet.ts";
import { VariantCloneParams } from "./types.ts";

class NPCPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends CreaturePF2e<TParent> {
    declare initiative: ActorInitiative;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "physical", "spellcastingEntry", "spell", "action", "melee", "lore"];
    }

    /** The level of this creature without elite/weak adjustments */
    get baseLevel(): number {
        return this._source.system.details.level.value;
    }

    /** This NPC's ability scores */
    override get abilities(): Abilities {
        return deepClone(this.system.abilities);
    }

    get description(): string {
        return this.system.details.publicNotes;
    }

    override get hardness(): number {
        return Math.abs(this.system.attributes.hardness?.value ?? 0);
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
        const proficiencyWithoutLevel = game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
        return creatureIdentificationDCs(this, { proficiencyWithoutLevel });
    }

    /** Users with limited permission can loot a dead NPC */
    override canUserModify(user: User, action: UserAction): boolean {
        if (action === "update" && this.isLootable) {
            return this.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
        }
        return super.canUserModify(user, action);
    }

    /** A user can see a synthetic NPC in the actor directory only if they have at least Observer permission */
    override get visible(): boolean {
        return !this.isToken && this.prototypeToken.actorLink
            ? super.visible
            : this.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    }

    get isLootable(): boolean {
        const npcsAreLootable = game.settings.get("pf2e", "automation.lootableNPCs");
        return this.isDead && (npcsAreLootable || this.flags.pf2e.lootable);
    }

    /** Grant all users at least limited permission on dead NPCs */
    override get permission(): DocumentOwnershipLevel {
        if (game.user.isGM || !this.isLootable) {
            return super.permission;
        }
        return Math.max(super.permission, 1) as DocumentOwnershipLevel;
    }

    /** Grant players limited permission on dead NPCs */
    override testUserPermission(
        user: User,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        options?: { exact?: boolean }
    ): boolean {
        // Temporary measure until a lootable view of the legacy sheet is ready
        if (game.user.isGM || !this.isLootable) {
            return super.testUserPermission(user, permission, options);
        }
        if ([1, "LIMITED"].includes(permission) && !options) {
            return this.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
        }
        return super.testUserPermission(user, permission, options);
    }

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.flags.pf2e.lootable ??= false;

        const systemData = this.system;
        systemData.actions = [];
        for (const key of SAVE_TYPES) {
            systemData.saves[key].ability = CONFIG.PF2E.savingThrowDefaultAbilities[key];
        }

        const { attributes, details } = systemData;
        attributes.perception.ability = "wis";
        attributes.reach = {
            base: SIZE_TO_REACH[this.size],
            manipulate: SIZE_TO_REACH[this.size],
        };

        if (details.alliance === undefined) {
            details.alliance = this.hasPlayerOwner ? "party" : "opposition";
        }

        // Ensure undead have negative healing
        attributes.hp.negativeHealing = systemData.traits.value.includes("undead");

        // Exclude troops from being flankable
        attributes.flanking.flankable = !systemData.traits.value.includes("troop");

        // NPC level needs to be known before the rest of the weak/elite adjustments
        const { level } = details;
        level.base = level.value;
        level.value = this.isElite ? level.base + 1 : this.isWeak ? level.base - 1 : level.base;
        this.rollOptions.all[`self:level:${level.value}`] = true;

        attributes.classDC = ((): { value: number } => {
            const proficiencyWithoutLevel =
                game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
            const levelBasedDC = calculateDC(level.base, { proficiencyWithoutLevel, rarity: this.rarity });
            const adjusted = this.isElite ? levelBasedDC + 2 : this.isWeak ? levelBasedDC - 2 : levelBasedDC;
            return { value: adjusted };
        })();

        // Set default ritual attack and DC values if none are stored */
        this.system.spellcasting = mergeObject({ rituals: { dc: 0 } }, this.system.spellcasting ?? {});
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        const { system } = this;

        // Extract as separate variables for easier use in this method.
        const { synthetics } = this;
        const { modifierAdjustments, statisticsModifiers, strikes } = synthetics;
        const itemTypes = this.itemTypes;
        const baseLevel = this.system.details.level.base;

        if (this.isElite) {
            modifierAdjustments.all.push({
                slug: "base",
                getNewValue: (base: number) => base + 2,
                predicate: new PredicatePF2e(),
            });
            statisticsModifiers.hp = statisticsModifiers.hp ?? [];
            statisticsModifiers.hp.push(
                () =>
                    new ModifierPF2e(
                        "PF2E.NPC.Adjustment.EliteLabel",
                        this.getHpAdjustment(baseLevel, "elite"),
                        "untyped"
                    )
            );
        } else if (this.isWeak) {
            modifierAdjustments.all.push({
                slug: "base",
                getNewValue: (base: number) => base - 2,
                predicate: new PredicatePF2e(),
            });
            statisticsModifiers.hp = statisticsModifiers.hp ?? [];
            statisticsModifiers.hp.push(
                () =>
                    new ModifierPF2e(
                        "PF2E.NPC.Adjustment.WeakLabel",
                        this.getHpAdjustment(baseLevel, "weak") * -1,
                        "untyped"
                    )
            );
        }
        system.details.level.base = baseLevel;

        // Compute 10+mod ability scores from ability modifiers
        for (const ability of Object.values(this.system.abilities)) {
            ability.mod = Number(ability.mod) || 0;
            ability.value = ability.mod * 2 + 10;
        }

        // Hit Points
        {
            const base = system.attributes.hp.max;
            const modifiers: ModifierPF2e[] = [
                extractModifiers(this.synthetics, ["hp"], { test: this.getRollOptions(["hp"]) }),
                extractModifiers(this.synthetics, ["hp-per-level"], {
                    test: this.getRollOptions(["hp-per-level"]),
                }).map((modifier) => {
                    modifier.modifier *= this.level;
                    return modifier;
                }),
            ].flat();

            const hpData = deepClone(system.attributes.hp);
            const stat = mergeObject(new StatisticModifier("hp", modifiers), hpData, { overwrite: false });

            stat.base = base;
            stat.max = stat.max + stat.totalModifier;
            stat.value = Math.min(stat.value, stat.max); // Make sure the current HP isn't higher than the max HP
            stat.breakdown = [
                game.i18n.format("PF2E.MaxHitPointsBaseLabel", { base }),
                ...stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`),
            ].join(", ");

            system.attributes.hp = stat;

            // Set a roll option for HP percentage
            const percentRemaining = Math.floor((stat.value / stat.max) * 100);
            this.rollOptions.all[`hp-remaining:${stat.value}`] = true;
            this.rollOptions.all[`hp-percent:${percentRemaining}`] = true;
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
        this.system.attributes.ac = armorStatistic.getTraceData();

        this.prepareSaves();

        // Perception
        {
            const domains = ["perception", "wis-based", "all"];
            this.perception = new Statistic(this, {
                slug: "perception",
                label: "PF2E.PerceptionLabel",
                ability: "wis",
                domains,
                modifiers: [
                    new ModifierPF2e({
                        slug: "base",
                        label: "PF2E.ModifierTitle",
                        modifier: system.attributes.perception.value,
                        adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                    }),
                ],
                check: { type: "perception-check" },
            });
            system.attributes.perception = mergeObject(
                system.attributes.perception,
                this.perception.getTraceData({ value: "mod" })
            );
        }

        this.skills = this.prepareSkills();

        // process strikes.
        const generatedMelee = Array.from(strikes.values()).flatMap((w) => w.toNPCAttacks());
        for (const item of [...this.itemTypes.melee, ...generatedMelee]) {
            system.actions.push(strikeFromMeleeItem(item));
        }

        // Spellcasting Entries
        for (const entry of itemTypes.spellcastingEntry) {
            const { ability, tradition } = entry;

            // There are still some bestiary entries where these values are strings
            entry.system.spelldc.dc = Number(entry.system.spelldc.dc);
            entry.system.spelldc.value = Number(entry.system.spelldc.value);
            // Modifier adjustments aren't implemented in `Statistic` yet
            if (this.isElite) {
                entry.system.spelldc.dc += 2;
                entry.system.spelldc.value += 2;
            } else if (this.isWeak) {
                entry.system.spelldc.dc -= 2;
                entry.system.spelldc.value -= 2;
            }

            const baseSelectors = ["all", `${ability}-based`, "spell-attack-dc"];
            const attackSelectors = [
                `${tradition}-spell-attack`,
                "spell-attack",
                "spell-attack-roll",
                "attack",
                "attack-roll",
            ];
            const saveSelectors = [`${tradition}-spell-dc`, "spell-dc"];

            // Check Modifiers, calculate using the user configured value
            const baseMod = Number(entry.system?.spelldc?.value ?? 0);
            const attackModifiers = [new ModifierPF2e("PF2E.ModifierTitle", baseMod, "untyped")];

            // Save Modifiers, reverse engineer using the user configured value - 10
            const baseDC = Number(entry.system?.spelldc?.dc ?? 0);
            const saveModifiers = [new ModifierPF2e("PF2E.ModifierTitle", baseDC - 10, "untyped")];

            // Assign statistic data to the spellcasting entry
            entry.statistic = new Statistic(this, {
                slug: sluggify(`${entry.name}-spellcasting`),
                label: CONFIG.PF2E.magicTraditions[tradition ?? "arcane"],
                domains: baseSelectors,
                rollOptions: entry.getRollOptions("spellcasting"),
                check: {
                    type: "spell-attack-roll",
                    modifiers: attackModifiers,
                    domains: attackSelectors,
                },
                dc: {
                    modifiers: saveModifiers,
                    domains: saveSelectors,
                },
            });
        }

        // A class-or-spell DC to go alongside the fake class DC
        this.system.attributes.classOrSpellDC = ((): { value: number } => {
            const spellDCs = this.itemTypes.spellcastingEntry.map((e) => e.system.spelldc.dc);
            return { value: Math.max(...spellDCs, this.system.attributes.classDC.value) };
        })();

        // Initiative
        this.initiative = new ActorInitiative(this);
        this.system.attributes.initiative = this.initiative.getTraceData();
    }

    private prepareSaves(): void {
        const systemData = this.system;
        const { modifierAdjustments } = this.synthetics;

        // Saving Throws
        const saves: Partial<Record<SaveType, Statistic>> = {};
        for (const saveType of SAVE_TYPES) {
            const save = systemData.saves[saveType];
            const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const base = save.value;
            const ability = save.ability;

            const domains = [saveType, `${ability}-based`, "saving-throw", "all"];
            const stat = new Statistic(this, {
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

            saves[saveType] = stat;
            mergeObject(this.system.saves[saveType], stat.getTraceData());
            systemData.saves[saveType].base = base;
        }

        this.saves = saves as Record<SaveType, Statistic>;
    }

    private prepareSkills(): CreatureSkills {
        const { system } = this;
        const { modifierAdjustments } = this.synthetics;

        // Internal function to create trace data, since NPCs still use the lore item type
        system.skills = {};
        function createTrace(stat: Statistic, item?: LorePF2e<NPCPF2e>) {
            const { ability, shortForm } = objectHasKey(SKILL_EXPANDED, stat.slug)
                ? SKILL_EXPANDED[stat.slug]
                : { ability: "int" as AbilityString, shortForm: stat.slug };
            system.skills[shortForm] = {
                ...stat.getTraceData(),
                base: item?.system.mod.value,
                isLore: !!stat.lore,
                itemID: item?.id,
                ability,
                visible: stat.proficient,
                variants: Object.values(item?.system.variants ?? {}),
            };
        }

        // Create default "untrained" skills for all basic types first
        const skills: Partial<CreatureSkills> = {};
        for (const skill of SKILL_LONG_FORMS) {
            const { ability, shortForm } = SKILL_EXPANDED[skill];
            const domains = [skill, `${ability}-based`, "skill-check", `${ability}-skill-check`, "all"];
            const name = game.i18n.localize(`PF2E.Skill${SKILL_DICTIONARY[shortForm].capitalize()}`);

            const statistic = new Statistic(this, {
                slug: skill,
                label: name,
                ability,
                domains,
                modifiers: [
                    new ModifierPF2e({
                        slug: "base",
                        label: "PF2E.ModifierTitle",
                        modifier: system.abilities[ability].mod,
                        adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                    }),
                ],
                lore: false,
                proficient: false,
                check: { type: "skill-check" },
            });

            skills[skill] = statistic;
            createTrace(statistic);
        }

        for (const item of this.itemTypes.lore) {
            // override untrained skills if defined in the NPC data
            const skill = sluggify(item.name); // normalize skill name to lower-case and dash-separated words
            const ability = objectHasKey(SKILL_EXPANDED, skill) ? SKILL_EXPANDED[skill].ability : "int";
            const label = objectHasKey(CONFIG.PF2E.skillList, skill) ? CONFIG.PF2E.skillList[skill] : item.name;

            const base = item.system.mod.value;
            const domains = [
                skill,
                `${ability}-based`,
                "skill-check",
                "lore-skill-check",
                `${ability}-skill-check`,
                "all",
            ];

            const statistic = new Statistic(this, {
                slug: skill,
                label,
                ability,
                lore: !objectHasKey(SKILL_EXPANDED, skill),
                domains,
                modifiers: [
                    new ModifierPF2e({
                        slug: "base",
                        label: "PF2E.ModifierTitle",
                        modifier: base,
                        adjustments: extractModifierAdjustments(modifierAdjustments, domains, "base"),
                    }),
                ],
                check: { type: "skill-check" },
            });

            skills[skill] = statistic;
            createTrace(statistic, item);
        }

        return skills as CreatureSkills;
    }

    async getAttackEffects(attack: MeleePF2e): Promise<RollNotePF2e[]> {
        const notes: RollNotePF2e[] = [];
        if (attack.description) {
            notes.push(
                new RollNotePF2e({
                    selector: "all",
                    visibility: "gm",
                    text: attack.description,
                })
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
                (i) => i.type !== "melee" && (i.slug ?? sluggify(i.name)) === sluggify(attackEffect)
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
                if (packItem instanceof ItemPF2e) {
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

    get sheet(): AbstractNPCSheet<this>;
}

export { NPCPF2e };
