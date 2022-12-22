import { CreaturePF2e, FamiliarPF2e } from "@actor";
import { Abilities, CreatureSpeeds, LabeledSpeed, MovementType, SkillAbbreviation } from "@actor/creature/data";
import { CreatureUpdateContext } from "@actor/creature/types";
import { ALLIANCES } from "@actor/creature/values";
import { CharacterSource } from "@actor/data";
import { ActorSizePF2e } from "@actor/data/size";
import { calculateMAPs } from "@actor/helpers";
import {
    CheckModifier,
    createAbilityModifier,
    createProficiencyModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    MODIFIER_TYPE,
    StatisticModifier,
} from "@actor/modifiers";
import {
    AbilityString,
    AttackItem,
    AttackRollContext,
    SaveType,
    StrikeRollContext,
    StrikeRollContextParams,
} from "@actor/types";
import {
    ABILITY_ABBREVIATIONS,
    SAVE_TYPES,
    SKILL_ABBREVIATIONS,
    SKILL_DICTIONARY,
    SKILL_DICTIONARY_REVERSE,
    SKILL_EXPANDED,
} from "@actor/values";
import {
    AncestryPF2e,
    BackgroundPF2e,
    ClassPF2e,
    ConsumablePF2e,
    DeityPF2e,
    FeatPF2e,
    HeritagePF2e,
    ItemPF2e,
    PhysicalItemPF2e,
    WeaponPF2e,
} from "@item";
import { ActionTrait } from "@item/action/data";
import { ARMOR_CATEGORIES } from "@item/armor/values";
import { ItemType, PhysicalItemSource } from "@item/data";
import { ItemCarryType } from "@item/physical/data";
import { getPropertyRunes, getPropertySlots, getResiliencyBonus } from "@item/physical/runes";
import { MagicTradition } from "@item/spell/types";
import { MAGIC_TRADITIONS } from "@item/spell/values";
import { WeaponDamage, WeaponSource, WeaponSystemSource } from "@item/weapon/data";
import { WeaponCategory, WeaponPropertyRuneType } from "@item/weapon/types";
import { WEAPON_CATEGORIES, WEAPON_PROPERTY_RUNE_TYPES } from "@item/weapon/values";
import { ChatMessagePF2e } from "@module/chat-message";
import { PROFICIENCY_RANKS, ZeroToFour, ZeroToThree } from "@module/data";
import { RollNotePF2e } from "@module/notes";
import {
    extractDegreeOfSuccessAdjustments,
    extractModifierAdjustments,
    extractModifiers,
    extractNotes,
    extractRollSubstitutions,
    extractRollTwice,
} from "@module/rules/util";
import { UserPF2e } from "@module/user";
import { CheckPF2e, CheckRoll, CheckRollContext } from "@system/check";
import { DamagePF2e, DamageRollContext, WeaponDamagePF2e } from "@system/damage";
import { DamageRoll } from "@system/damage/roll";
import { PredicatePF2e } from "@system/predication";
import { RollParameters, StrikeRollParams } from "@system/rolls";
import { Statistic } from "@system/statistic";
import {
    ErrorPF2e,
    getActionGlyph,
    objectHasKey,
    setHasElement,
    sluggify,
    sortedStringify,
    traitSlugToObject,
} from "@util";
import { fromUUIDs } from "@util/from-uuids";
import { CraftingEntry, CraftingEntryData, CraftingFormula } from "./crafting";
import {
    AuxiliaryAction,
    BaseWeaponProficiencyKey,
    CharacterArmorClass,
    CharacterAttributes,
    CharacterData,
    CharacterFlags,
    CharacterProficiency,
    CharacterSaves,
    CharacterSkillData,
    CharacterStrike,
    CharacterSystemData,
    ClassDCData,
    LinkedProficiency,
    MagicTraditionProficiencies,
    MartialProficiencies,
    MartialProficiency,
    WeaponGroupProficiencyKey,
} from "./data";
import { CharacterSheetTabVisibility } from "./data/sheet";
import { CharacterFeats } from "./feats";
import { createForceOpenPenalty, createShoddyPenalty, StrikeWeaponTraits } from "./helpers";
import { CharacterHitPointsSummary, CharacterSkills, CreateAuxiliaryParams, DexterityModifierCapData } from "./types";
import { CHARACTER_SHEET_TABS } from "./values";

class CharacterPF2e extends CreaturePF2e {
    /** Core singular embeds for PCs */
    ancestry!: Embedded<AncestryPF2e> | null;
    heritage!: Embedded<HeritagePF2e> | null;
    background!: Embedded<BackgroundPF2e> | null;
    class!: Embedded<ClassPF2e> | null;
    deity!: Embedded<DeityPF2e> | null;

    /** A cached reference to this PC's familiar */
    familiar: FamiliarPF2e | null = null;

    feats!: CharacterFeats;
    pfsBoons!: FeatPF2e[];
    deityBoonsCurses!: FeatPF2e[];

    /** All base casting tradition proficiences, which spellcasting build off of */
    traditions!: Record<MagicTradition, Statistic>;

    /** The primary class DC */
    classDC!: Statistic | null;
    /** All class DCs regardless of whether or not its the primary */
    classDCs!: Record<string, Statistic>;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        const buildItems = ["ancestry", "heritage", "background", "class", "deity", "feat"] as const;
        return [...super.allowedItemTypes, ...buildItems, "physical", "spellcastingEntry", "spell", "action", "lore"];
    }

    get keyAbility(): AbilityString {
        return this.system.details.keyability.value || "str";
    }

    /** This PC's ability scores */
    get abilities(): Abilities {
        return deepClone(this.system.abilities);
    }

    override get hitPoints(): CharacterHitPointsSummary {
        return {
            ...super.hitPoints,
            recoveryMultiplier: this.system.attributes.hp.recoveryMultiplier,
            recoveryAddend: this.system.attributes.hp.recoveryAddend,
        };
    }

    override get skills(): CharacterSkills {
        const skills = super.skills;
        for (const [key, skill] of Object.entries(skills)) {
            if (!skill) continue;
            const originalKey = SKILL_DICTIONARY_REVERSE[skill.slug] ?? skill.slug;
            if (!objectHasKey(this.system.skills, originalKey)) continue;

            const data = this.system.skills[originalKey];
            skills[key] = mergeObject(skill, {
                rank: data.rank,
                ability: data.ability,
                proficient: data.rank >= 1,
                abilityModifier: data.modifiers.find((m) => m.enabled && m.type === "ability") ?? null,
            });
        }

        return skills as CharacterSkills;
    }

    get heroPoints(): { value: number; max: number } {
        return deepClone(this.system.resources.heroPoints);
    }

    async getCraftingFormulas(): Promise<CraftingFormula[]> {
        const { formulas } = this.system.crafting;
        const formulaMap = new Map(formulas.map((data) => [data.uuid, data]));
        const items: unknown[] = await fromUUIDs(formulas.map((data) => data.uuid));
        if (!items.every((i): i is ItemPF2e => i instanceof ItemPF2e)) return [];

        return items
            .filter((item): item is PhysicalItemPF2e => item instanceof PhysicalItemPF2e)
            .map((item) => {
                const { dc, batchSize, deletable } = formulaMap.get(item.uuid) ?? { deletable: false };
                return new CraftingFormula(item, { dc, batchSize, deletable });
            });
    }

    async getCraftingEntries(): Promise<CraftingEntry[]> {
        const craftingFormulas = await this.getCraftingFormulas();
        return Object.values(this.system.crafting.entries)
            .filter((entry): entry is CraftingEntryData => CraftingEntry.isValid(entry))
            .map((entry) => new CraftingEntry(this, craftingFormulas, entry));
    }

    async getCraftingEntry(selector: string): Promise<CraftingEntry | null> {
        const craftingFormulas = await this.getCraftingFormulas();
        const craftingEntryData = this.system.crafting.entries[selector];
        if (CraftingEntry.isValid(craftingEntryData)) {
            return new CraftingEntry(this, craftingFormulas, craftingEntryData);
        }

        return null;
    }

    async performDailyCrafting(): Promise<void> {
        const entries = (await this.getCraftingEntries()).filter((e) => e.isDailyPrep);
        const alchemicalEntries = entries.filter((e) => e.isAlchemical);
        const reagentCost = alchemicalEntries.reduce((sum, entry) => sum + entry.reagentCost, 0);
        const reagentValue = (this.system.resources.crafting.infusedReagents.value || 0) - reagentCost;
        if (reagentValue < 0) {
            ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MissingReagents"));
            return;
        } else {
            await this.update({ "system.resources.crafting.infusedReagents.value": reagentValue });
        }

        // Remove infused/temp items
        for (const item of this.inventory) {
            if (item.system.temporary) await item.delete();
        }

        for (const entry of entries) {
            for (const formula of entry.preparedCraftingFormulas) {
                const itemSource: PhysicalItemSource = formula.item.toObject();
                itemSource.system.quantity = formula.quantity;
                itemSource.system.temporary = true;
                itemSource.system.size = this.ancestry?.size === "tiny" ? "tiny" : "med";

                if (
                    entry.isAlchemical &&
                    (itemSource.type === "consumable" ||
                        itemSource.type === "weapon" ||
                        itemSource.type === "equipment")
                ) {
                    itemSource.system.traits.value.push("infused");
                }
                await this.addToInventory(itemSource);
            }
        }
    }

    /** If one exists, prepare this character's familiar */
    override prepareData(): void {
        super.prepareData();

        if (game.ready && this.familiar && game.actors.has(this.familiar.id)) {
            this.familiar.prepareData({ fromMaster: true });
        }
    }

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();
        const systemData: DeepPartial<CharacterSystemData> & { abilities: Abilities } = this.system;

        // Flags
        const { flags } = this;
        flags.pf2e.favoredWeaponRank = 0;
        flags.pf2e.freeCrafting ??= false;
        flags.pf2e.quickAlchemy ??= false;
        flags.pf2e.sheetTabs = mergeObject(
            CHARACTER_SHEET_TABS.reduce(
                (tabs, tab) => ({
                    ...tabs,
                    [tab]: true,
                }),
                {} as CharacterSheetTabVisibility
            ),
            flags.pf2e.sheetTabs ?? {}
        );
        flags.pf2e.showBasicUnarmed ??= true;

        // Build selections: boosts and skill trainings
        const isGradual = game.settings.get("pf2e", "gradualBoostsVariant");
        const boostLevels = [1, 5, 10, 15, 20] as const;
        const allowedBoosts = boostLevels.reduce((result, level) => {
            const allowed = (() => {
                if (this.level === 0 && level === 1) return 4;
                if (isGradual) return 4 - Math.clamped(level - this.level, 0, 4);
                return this.level >= level ? 4 : 0;
            })();

            result[level] = allowed;
            return result;
        }, {} as Record<typeof boostLevels[number], number>);
        const existingBoosts = systemData.build?.abilities?.boosts;
        systemData.build = {
            abilities: {
                manual: Object.keys(systemData.abilities).length > 0,
                keyOptions: [],
                boosts: {
                    ancestry: [],
                    background: [],
                    class: null,
                    1: existingBoosts?.[1]?.slice(0, allowedBoosts[1]) ?? [],
                    5: existingBoosts?.[5]?.slice(0, allowedBoosts[5]) ?? [],
                    10: existingBoosts?.[10]?.slice(0, allowedBoosts[10]) ?? [],
                    15: existingBoosts?.[15]?.slice(0, allowedBoosts[15]) ?? [],
                    20: existingBoosts?.[20]?.slice(0, allowedBoosts[20]) ?? [],
                },
                allowedBoosts,
                flaws: {
                    ancestry: [],
                },
            },
        };

        // Base ability scores
        for (const abbrev of ABILITY_ABBREVIATIONS) {
            systemData.abilities[abbrev] = mergeObject({ value: 10 }, systemData.abilities[abbrev] ?? {});
        }

        // Actor document and data properties from items
        const { details } = this.system;
        for (const property of ["ancestry", "heritage", "background", "class", "deity"] as const) {
            this[property] = null;

            if (property === "deity") {
                details.deities = {
                    primary: null,
                    secondary: null,
                    domains: {},
                };
            } else if (property !== "background") {
                details[property] = null;
            }
        }

        // Alliance, deferring to manually set value and falling back to player ownership
        details.alliance = ALLIANCES.has(details.alliance)
            ? details.alliance
            : this.hasPlayerOwner
            ? "party"
            : "opposition";

        // Attributes
        const attributes: DeepPartial<CharacterAttributes> = this.system.attributes;
        attributes.ac = {};
        attributes.classDC = null;
        attributes.polymorphed = false;
        attributes.battleForm = false;

        const perception = (attributes.perception ??= { ability: "wis", rank: 0 });
        perception.ability = "wis";
        perception.rank ??= 0;

        // Hit points
        const hitPoints = this.system.attributes.hp;
        hitPoints.recoveryMultiplier = 1;
        hitPoints.recoveryAddend = 0;
        attributes.ancestryhp = 0;
        attributes.classhp = 0;

        // Familiar abilities
        attributes.familiarAbilities = { value: 0 };

        // Saves and skills
        const saves: DeepPartial<CharacterSaves> = this.system.saves;
        for (const save of SAVE_TYPES) {
            saves[save] = {
                ability: CONFIG.PF2E.savingThrowDefaultAbilities[save],
                rank: saves[save]?.rank ?? 0,
            };
        }

        const skills = this.system.skills;
        for (const key of SKILL_ABBREVIATIONS) {
            const skill = skills[key];
            skill.ability = SKILL_EXPANDED[SKILL_DICTIONARY[key]].ability;
            skill.armor = ["dex", "str"].includes(skill.ability);
        }

        // Spellcasting-tradition proficiencies
        systemData.proficiencies = {
            classDCs: {},
            traditions: Array.from(MAGIC_TRADITIONS).reduce(
                (accumulated: DeepPartial<MagicTraditionProficiencies>, t) => ({
                    ...accumulated,
                    [t]: { rank: 0 },
                }),
                {}
            ),
        };

        // Resources
        const { resources } = this.system;
        resources.heroPoints.max = 3;
        resources.investiture = { value: 0, max: 10 };

        resources.focus = mergeObject({ value: 0, max: 0 }, resources.focus ?? {});
        resources.focus.max = 0;
        resources.focus.cap = 3;

        resources.crafting = mergeObject({ infusedReagents: { value: 0, max: 0 } }, resources.crafting ?? {});
        resources.crafting.infusedReagents.max = 0;

        // Size
        this.system.traits.size = new ActorSizePF2e({ value: "med" });

        // Weapon and Armor category proficiencies
        const martial: DeepPartial<MartialProficiencies> = this.system.martial;
        for (const category of [...ARMOR_CATEGORIES, ...WEAPON_CATEGORIES]) {
            const proficiency: Partial<CharacterProficiency> = martial[category] ?? {};
            proficiency.rank = martial[category]?.rank ?? 0;
            martial[category] = proficiency;
        }

        const homebrewCategories = game.settings.get("pf2e", "homebrew.weaponCategories").map((tag) => tag.id);
        for (const category of homebrewCategories) {
            martial[category] ??= {
                rank: 0,
                value: 0,
                breakdown: "",
            };
        }

        // Indicate that crafting formulas stored directly on the actor are deletable
        for (const formula of this.system.crafting.formulas) {
            formula.deletable = true;
        }

        this.system.crafting.entries = {};

        // PC level is never a derived number, so it can be set early
        this.rollOptions.all[`self:level:${this.level}`] = true;
    }

    /** After AE-likes have been applied, set numeric roll options */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();

        for (const ability of Object.values(this.system.abilities)) {
            ability.mod = Math.floor((ability.value - 10) / 2);
        }

        this.setNumericRollOptions();
        this.deity?.setFavoredWeaponRank();
    }

    /**
     * Immediately after boosts from this PC's ancestry, background, and class have been acquired, set ability scores
     * according to them.
     */
    override prepareDataFromItems(): void {
        super.prepareDataFromItems();
        this.setAbilityScores();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const systemData = this.system;
        const { synthetics } = this;

        if (!this.flags.pf2e.disableABP) {
            game.pf2e.variantRules.AutomaticBonusProgression.concatModifiers(this.level, synthetics);
        }

        // Extract as separate variables for easier use in this method.
        const { statisticsModifiers, rollNotes } = synthetics;

        // Update experience percentage from raw experience amounts.
        systemData.details.xp.pct = Math.min(
            Math.round((systemData.details.xp.value * 100) / systemData.details.xp.max),
            99.5
        );

        // Get the itemTypes object only once for the entire run of the method
        const itemTypes = this.itemTypes;

        // PFS Level Bump - check and DC modifiers
        if (systemData.pfs.levelBump) {
            const params = { slug: "level-bump", label: "PF2E.PFS.LevelBump", modifier: 1 };
            statisticsModifiers.all.push(() => new ModifierPF2e(params));
            statisticsModifiers.damage.push(() => new ModifierPF2e(params));
        }

        // Calculate HP and SP
        {
            const ancestryHP = systemData.attributes.ancestryhp;
            const classHP = systemData.attributes.classhp;
            const hitPoints = systemData.attributes.hp;
            const modifiers = [new ModifierPF2e("PF2E.AncestryHP", ancestryHP, MODIFIER_TYPE.UNTYPED)];

            if (game.settings.get("pf2e", "staminaVariant")) {
                const halfClassHp = Math.floor(classHP / 2);
                systemData.attributes.sp.max = (halfClassHp + systemData.abilities.con.mod) * this.level;
                systemData.attributes.resolve.max = systemData.abilities[systemData.details.keyability.value].mod;

                modifiers.push(new ModifierPF2e("PF2E.ClassHP", halfClassHp * this.level, MODIFIER_TYPE.UNTYPED));
            } else {
                modifiers.push(new ModifierPF2e("PF2E.ClassHP", classHP * this.level, MODIFIER_TYPE.UNTYPED));

                // Facilitate level-zero variant play by always adding the constitution modifier at at least level 1
                const conHP = systemData.abilities.con.mod * Math.max(this.level, 1);
                modifiers.push(
                    new ModifierPF2e({
                        slug: "hp-con",
                        label: "PF2E.AbilityCon",
                        ability: "con",
                        type: MODIFIER_TYPE.ABILITY,
                        modifier: conHP,
                        adjustments: extractModifierAdjustments(
                            synthetics.modifierAdjustments,
                            ["con-based"],
                            "hp-con"
                        ),
                    })
                );
            }

            const hpRollOptions = this.getRollOptions(["hp"]);
            modifiers.push(...extractModifiers(synthetics, ["hp"], { test: hpRollOptions }));

            const perLevelRollOptions = this.getRollOptions(["hp-per-level"]);
            modifiers.push(
                ...extractModifiers(synthetics, ["hp-per-level"], { test: perLevelRollOptions }).map((clone) => {
                    clone.modifier *= this.level;
                    return clone;
                })
            );

            const stat = mergeObject(new StatisticModifier("hp", modifiers), hitPoints, { overwrite: false });

            // PFS Level Bump - hit points
            if (systemData.pfs.levelBump) {
                const hitPointsBump = Math.max(10, stat.totalModifier * 0.1);
                stat.push(new ModifierPF2e("PF2E.PFS.LevelBump", hitPointsBump, MODIFIER_TYPE.UNTYPED));
            }

            stat.max = stat.totalModifier;
            stat.value = Math.min(stat.value, stat.max); // Make sure the current HP isn't higher than the max HP
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");

            systemData.attributes.hp = stat;

            // Set a roll option for HP percentage
            const percentRemaining = Math.floor((stat.value / stat.max) * 100);
            this.rollOptions.all[`hp-percent:${percentRemaining}`] = true;
        }

        this.prepareFeats();
        this.prepareSaves();
        this.prepareMartialProficiencies();

        // Perception
        {
            const domains = ["perception", "wis-based", "all"];
            const proficiencyRank = systemData.attributes.perception.rank;
            const modifiers = [
                createAbilityModifier({ actor: this, ability: "wis", domains }),
                createProficiencyModifier({ actor: this, rank: proficiencyRank, domains }),
            ];

            modifiers.push(...extractModifiers(synthetics, domains));

            const stat = mergeObject(
                new StatisticModifier("perception", modifiers, this.getRollOptions(domains)),
                systemData.attributes.perception,
                { overwrite: false }
            );
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            stat.notes = extractNotes(rollNotes, domains);
            stat.value = stat.totalModifier;
            stat.roll = async (params: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                const label = game.i18n.localize("PF2E.PerceptionCheck");
                const rollOptions = new Set(params.options ?? []);
                ensureProficiencyOption(rollOptions, proficiencyRank);

                // Get just-in-time roll options from rule elements
                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    rule.beforeRoll?.(domains, rollOptions);
                }

                const rollTwice = extractRollTwice(synthetics.rollTwice, domains, rollOptions);
                const context: CheckRollContext = {
                    actor: this,
                    type: "perception-check",
                    options: rollOptions,
                    dc: params.dc,
                    rollTwice,
                    notes: stat.notes,
                    dosAdjustments: extractDegreeOfSuccessAdjustments(synthetics, domains),
                };

                const roll = await CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    context,
                    params.event,
                    params.callback
                );

                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                }

                return roll;
            };

            systemData.attributes.perception = stat;
        }

        // Skills
        systemData.skills = this.prepareSkills();

        // Senses
        this.system.traits.senses = this.prepareSenses(this.system.traits.senses, synthetics);

        // Magic Traditions Proficiencies (for spell attacks and counteract checks)
        this.traditions = Array.from(MAGIC_TRADITIONS).reduce((traditions, tradition) => {
            traditions[tradition] = new Statistic(this, {
                slug: tradition,
                label: CONFIG.PF2E.magicTraditions[tradition],
                rank: systemData.proficiencies.traditions[tradition].rank,
                domains: ["all", "spell-attack-dc"],
                check: {
                    type: "check",
                    domains: [`${tradition}-spell-attack`],
                },
                dc: {
                    domains: [`${tradition}-spell-dc`],
                },
            });

            return traditions;
        }, {} as Record<MagicTradition, Statistic>);

        // Class DC
        this.classDC = null;
        this.classDCs = {};
        for (const [slug, classDC] of Object.entries(systemData.proficiencies.classDCs)) {
            const statistic = this.prepareClassDC(slug, classDC);
            systemData.proficiencies.classDCs[slug] = mergeObject(classDC, statistic.getTraceData({ value: "dc" }));
            this.classDCs[slug] = statistic;
            if (classDC.primary) {
                this.classDC = statistic;
            }
        }
        systemData.attributes.classDC = Object.values(systemData.proficiencies.classDCs).find((c) => c.primary) ?? null;

        // Armor Class
        const { wornArmor, heldShield } = this;
        {
            const modifiers = [this.getShieldBonus() ?? []].flat();
            const dexCapSources: DexterityModifierCapData[] = [
                { value: Infinity, source: "" },
                ...synthetics.dexterityModifierCaps,
            ];
            let armorCheckPenalty = 0;
            const proficiency = wornArmor?.category ?? "unarmored";

            if (wornArmor) {
                dexCapSources.push({ value: Number(wornArmor.dexCap ?? 0), source: wornArmor.name });
                if (wornArmor.checkPenalty) {
                    // armor check penalty
                    if (typeof wornArmor.strength === "number" && systemData.abilities.str.value < wornArmor.strength) {
                        armorCheckPenalty = Number(wornArmor.checkPenalty ?? 0);
                    }
                }

                const slug = wornArmor.baseType ?? wornArmor.slug ?? sluggify(wornArmor.name);
                modifiers.unshift(
                    new ModifierPF2e({
                        label: wornArmor.name,
                        type: "item",
                        slug,
                        modifier: wornArmor.acBonus,
                        adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, ["all", "ac"], slug),
                    })
                );

                const shoddyPenalty = createShoddyPenalty(this, wornArmor, ["all", "ac"]);
                if (shoddyPenalty) modifiers.push(shoddyPenalty);
            }

            // DEX modifier is limited by the lowest cap, usually from armor
            const dexModifier = createAbilityModifier({
                actor: this,
                ability: "dex",
                domains: ["all", "ac", "dex-based"],
            });
            const dexCap = dexCapSources.reduce((lowest, candidate) =>
                lowest.value > candidate.value ? candidate : lowest
            );
            dexModifier.modifier = Math.min(dexModifier.modifier, dexCap.value);

            // In case an ability other than DEX is added, find the best ability modifier and use that as the ability on
            // which AC is based
            const abilityModifier = modifiers
                .filter((m) => m.type === "ability" && !!m.ability)
                .reduce((best, modifier) => (modifier.modifier > best.modifier ? modifier : best), dexModifier);
            const acAbility = abilityModifier.ability!;
            const domains = ["all", "ac", `${acAbility}-based`];

            const rank = systemData.martial[proficiency]?.rank ?? 0;
            modifiers.unshift(createProficiencyModifier({ actor: this, rank, domains }));
            modifiers.unshift(dexModifier);
            modifiers.push(...extractModifiers(synthetics, domains));

            const rollOptions = this.getRollOptions(domains);
            const stat: CharacterArmorClass = mergeObject(new StatisticModifier("ac", modifiers, rollOptions), {
                value: 10,
                breakdown: "",
                check: armorCheckPenalty,
                dexCap,
            });
            stat.value += stat.totalModifier;
            stat.breakdown = [game.i18n.localize("PF2E.ArmorClassBase")]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                )
                .join(", ");

            systemData.attributes.ac = stat;
        }

        // Apply the speed penalty from this character's held shield
        if (heldShield?.speedPenalty) {
            const speedPenalty = new ModifierPF2e(heldShield.name, heldShield.speedPenalty, MODIFIER_TYPE.UNTYPED);
            speedPenalty.predicate.push({ not: "self:shield:ignore-speed-penalty" });
            statisticsModifiers.speed ??= [];
            statisticsModifiers.speed.push(() => speedPenalty);
        }

        // Speeds
        const speeds = (systemData.attributes.speed = this.prepareSpeed("land"));
        speeds.otherSpeeds = (["burrow", "climb", "fly", "swim"] as const).flatMap((m) => this.prepareSpeed(m) ?? []);

        systemData.actions = this.prepareStrikes();

        systemData.actions.sort((l, r) => {
            if (l.ready !== r.ready) return (l.ready ? 0 : 1) - (r.ready ? 0 : 1);
            return (l.item.sort ?? 0) - (r.item.sort ?? 0);
        });

        // Spellcasting Entries
        for (const entry of itemTypes.spellcastingEntry) {
            if (entry.isInnate) {
                const allRanks = Object.values(this.traditions).map((t) => t.rank ?? 0);
                entry.system.proficiency.value = Math.max(1, entry.rank, ...allRanks) as ZeroToFour;
            }

            // Spellcasting entries extend other statistics, usually a tradition, but sometimes class dc
            const baseStat = this.getProficiencyStatistic(entry.system.proficiency.slug);
            if (!baseStat) continue;

            entry.system.ability.value = baseStat.ability ?? entry.system.ability.value;
            entry.system.proficiency.value = Math.max(entry.rank, baseStat.rank ?? 0) as ZeroToFour;
            entry.statistic = baseStat.extend({
                slug: entry.slug ?? sluggify(entry.name),
                ability: entry.ability,
                rank: entry.rank,
                rollOptions: entry.getRollOptions("spellcasting"),
                domains: ["spell-attack-dc", `${entry.ability}-based`],
                check: {
                    type: "spell-attack-roll",
                    domains: ["spell-attack", "spell-attack-roll", "attack", "attack-roll"],
                },
                dc: { domains: ["spell-dc"] },
            });
        }

        // Expose best spellcasting DC to character attributes
        if (itemTypes.spellcastingEntry.length > 0) {
            const best = itemTypes.spellcastingEntry.reduce((previous, current) => {
                return current.statistic.dc.value > previous.statistic.dc.value ? current : previous;
            });
            this.system.attributes.spellDC = { rank: best.statistic.rank ?? 0, value: best.statistic.dc.value };
        } else {
            this.system.attributes.spellDC = null;
        }

        // Expose the higher between highest spellcasting DC and (if present) best class DC
        this.system.attributes.classOrSpellDC = ((): { rank: number; value: number } => {
            const classDC = Object.values(this.system.proficiencies.classDCs).reduce(
                (best: ClassDCData | null, classDC) =>
                    best === null ? classDC : classDC.totalModifier > best.totalModifier ? classDC : best,
                null
            );

            const spellDC = this.system.attributes.spellDC;
            return spellDC && classDC
                ? spellDC.value > classDC.value
                    ? { ...spellDC }
                    : { rank: classDC.rank, value: classDC.value }
                : classDC && !spellDC
                ? { rank: classDC.rank, value: classDC.value }
                : spellDC && !classDC
                ? { ...spellDC }
                : { rank: 0, value: 0 };
        })();

        // Initiative
        this.prepareInitiative();

        // Resources
        const { focus, crafting } = this.system.resources;
        focus.max = Math.clamped(focus.max, 0, focus.cap);
        crafting.infusedReagents.value = Math.clamped(crafting.infusedReagents.value, 0, crafting.infusedReagents.max);
        // Ensure the character has a focus pool of at least one point if they have a focus spellcasting entry
        if (focus.max === 0 && this.spellcasting.regular.some((entry) => entry.isFocusPool)) {
            focus.max = 1;
        }

        // Set a roll option for whether this character has a familiar
        if (systemData.attributes.familiarAbilities.value > 0) {
            this.rollOptions.all["self:has-familiar"] = true;
        }

        // Call post-data-preparation RuleElement hooks
        for (const rule of this.rules) {
            try {
                rule.afterPrepareData?.();
            } catch (error) {
                // ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onAfterPrepareData on rule element ${rule}.`, error);
            }
        }
    }

    /** Using a string, attempts to retrieve a statistic proficiency */
    getProficiencyStatistic(slug: string): Statistic | null {
        if (slug === "classDC") return this.classDC;
        if (objectHasKey(this.traditions, slug)) return this.traditions[slug];
        return this.classDCs[slug] ?? this.skills[slug] ?? null;
    }

    private setAbilityScores(): void {
        const { build, details } = this.system;

        if (!build.abilities.manual) {
            for (const section of ["ancestry", "background", "class", 1, 5, 10, 15, 20] as const) {
                // All higher levels are stripped out during data prep
                const boosts = build.abilities.boosts[section];
                if (typeof boosts === "string") {
                    // Class's key ability score
                    const ability = this.system.abilities[boosts];
                    ability.value += ability.value >= 18 ? 1 : 2;
                } else if (Array.isArray(boosts)) {
                    for (const abbrev of boosts) {
                        const ability = this.system.abilities[abbrev];
                        ability.value += ability.value >= 18 ? 1 : 2;
                    }
                }

                // Optional and non-optional flaws only come from the ancestry section
                const flaws = section === "ancestry" ? build.abilities.flaws[section] : [];
                for (const abbrev of flaws) {
                    const ability = this.system.abilities[abbrev];
                    ability.value -= 2;
                }
            }

            details.keyability.value = build.abilities.boosts.class ?? "str";
        }

        // Enforce a minimum of 1 for rolled scores and a maximum of 30 for homebrew "mythic" mechanics
        for (const ability of Object.values(this.system.abilities)) {
            ability.value = Math.clamped(ability.value, 1, 30);
            // Record base values: same as stored value if in manual mode, and prior to RE modifications otherwise
            ability.base = ability.value;
        }
    }

    /** Set roll operations for ability scores, proficiency ranks, and number of hands free */
    protected setNumericRollOptions(): void {
        const rollOptionsAll = this.rollOptions.all;

        const perceptionRank = this.system.attributes.perception.rank;
        rollOptionsAll[`perception:rank:${perceptionRank}`] = true;

        for (const key of ABILITY_ABBREVIATIONS) {
            const score = this.abilities[key].value;
            rollOptionsAll[`ability:${key}:score:${score}`] = true;
        }

        for (const key of SKILL_ABBREVIATIONS) {
            const rank = this.system.skills[key].rank;
            rollOptionsAll[`skill:${key}:rank:${rank}`] = true;
        }

        for (const key of ARMOR_CATEGORIES) {
            const rank = this.system.martial[key].rank;
            rollOptionsAll[`defense:${key}:rank:${rank}`] = true;
        }

        for (const key of WEAPON_CATEGORIES) {
            const rank = this.system.martial[key].rank;
            rollOptionsAll[`attack:${key}:rank:${rank}`] = true;
        }

        for (const key of SAVE_TYPES) {
            const rank = this.system.saves[key].rank;
            rollOptionsAll[`save:${key}:rank:${rank}`] = true;
        }

        // Set number of hands free
        const heldItems = this.inventory.filter((i) => i.isHeld);
        const handsFree = heldItems.reduce((count, item) => {
            const handsOccupied = item.traits.has("free-hand") ? 0 : item.handsHeld;
            return Math.max(count - handsOccupied, 0);
        }, 2);

        this.attributes.handsFree = handsFree;
        rollOptionsAll[`hands-free:${handsFree}`] = true;

        // Some rules specify ignoring the Free Hand trait
        const handsReallyFree = heldItems.reduce((count, i) => Math.max(count - i.handsHeld, 0), 2);
        rollOptionsAll[`hands-free:but-really:${handsReallyFree}`] = true;
    }

    private prepareSaves(): void {
        const systemData = this.system;
        const { wornArmor } = this;

        // Saves
        const saves: Partial<Record<SaveType, Statistic>> = {};
        for (const saveType of SAVE_TYPES) {
            const save = systemData.saves[saveType];
            const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const modifiers: ModifierPF2e[] = [];
            const selectors = [saveType, `${save.ability}-based`, "saving-throw", "all"];

            // Add resilient bonuses for wearing armor with a resilient rune.
            if (wornArmor?.system.resiliencyRune.value) {
                const resilientBonus = getResiliencyBonus(wornArmor.system);
                if (resilientBonus > 0 && wornArmor.isInvested) {
                    modifiers.push(new ModifierPF2e(wornArmor.name, resilientBonus, MODIFIER_TYPE.ITEM));
                }
            }

            const affectedByBulwark = saveType === "reflex" && wornArmor?.traits.has("bulwark");
            if (affectedByBulwark) {
                const slug = "bulwark";
                const bulwarkModifier = new ModifierPF2e({
                    slug,
                    type: MODIFIER_TYPE.UNTYPED,
                    label: CONFIG.PF2E.armorTraits.bulwark,
                    modifier: 3,
                    predicate: ["damaging-effect"],
                    adjustments: extractModifierAdjustments(this.synthetics.modifierAdjustments, selectors, slug),
                });
                modifiers.push(bulwarkModifier);

                // Add a modifier adjustment to be picked up by the construction of this saving throw's Statistic
                const reflexAdjustments = (this.synthetics.modifierAdjustments[saveType] ??= []);
                reflexAdjustments.push({
                    slug: "dex",
                    predicate: new PredicatePF2e("damaging-effect"),
                    suppress: true,
                });
            }

            const stat = new Statistic(this, {
                slug: saveType,
                label: saveName,
                ability: save.ability,
                rank: save.rank,
                modifiers,
                domains: selectors,
                check: { type: "saving-throw" },
            });

            saves[saveType] = stat;
            this.system.saves[saveType] = mergeObject(this.system.saves[saveType], stat.getTraceData());
        }

        this.saves = saves as Record<SaveType, Statistic>;
    }

    private prepareSkills(): Record<SkillAbbreviation, CharacterSkillData> {
        const systemData = this.system;

        // rebuild the skills object to clear out any deleted or renamed skills from previous iterations
        const { synthetics, wornArmor } = this;

        const skills = Array.from(SKILL_ABBREVIATIONS).reduce((builtSkills, shortForm) => {
            const skill = systemData.skills[shortForm];
            const longForm = SKILL_DICTIONARY[shortForm];

            const domains = [longForm, `${skill.ability}-based`, "skill-check", `${skill.ability}-skill-check`, "all"];
            const modifiers = [
                createAbilityModifier({ actor: this, ability: skill.ability, domains }),
                createProficiencyModifier({ actor: this, rank: skill.rank, domains }),
            ];

            // Indicate that the strength requirement of this actor's armor is met
            if (typeof wornArmor?.strength === "number" && this.system.abilities.str.value >= wornArmor.strength) {
                for (const selector of ["skill-check", "initiative"]) {
                    const rollOptions = (this.rollOptions[selector] ??= {});
                    // Nullish assign to not overwrite setting by rule element
                    rollOptions["self:armor:strength-requirement-met"] ??= true;
                }
            }

            if (skill.armor && typeof wornArmor?.checkPenalty === "number") {
                const slug = "armor-check-penalty";
                const armorCheckPenalty = new ModifierPF2e({
                    slug,
                    label: "PF2E.ArmorCheckPenalty",
                    modifier: wornArmor.checkPenalty,
                    type: MODIFIER_TYPE.UNTYPED,
                    adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, domains, slug),
                });

                // Set requirements for ignoring the check penalty according to skill
                armorCheckPenalty.predicate.push({ nor: ["attack", "armor:ignore-check-penalty"] });
                if (["acrobatics", "athletics"].includes(longForm)) {
                    armorCheckPenalty.predicate.push({
                        nor: ["self:armor:strength-requirement-met", "self:armor:trait:flexible"],
                    });
                } else if (longForm === "stealth" && wornArmor.traits.has("noisy")) {
                    armorCheckPenalty.predicate.push({
                        nand: ["self:armor:strength-requirement-met", "armor:ignore-noisy-penalty"],
                    });
                } else {
                    armorCheckPenalty.predicate.push({ not: "self:armor:strength-requirement-met" });
                }

                modifiers.push(armorCheckPenalty);
            }

            // Add a penalty for attempting to Force Open without a crowbar or similar tool
            if (longForm === "athletics") modifiers.push(createForceOpenPenalty(this, domains));

            modifiers.push(...extractModifiers(synthetics, domains));

            const stat = mergeObject(new StatisticModifier(longForm, modifiers, this.getRollOptions(domains)), skill, {
                overwrite: false,
            });
            stat.breakdown = stat.modifiers
                .filter((modifier) => modifier.enabled)
                .map((modifier) => {
                    const prefix = modifier.modifier < 0 ? "" : "+";
                    return `${modifier.label} ${prefix}${modifier.modifier}`;
                })
                .join(", ");
            stat.value = stat.totalModifier;
            stat.notes = extractNotes(synthetics.rollNotes, domains);
            stat.rank = skill.rank;
            stat.roll = async (params: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                console.warn(
                    `Rolling skill checks via actor.system.skills.${shortForm}.roll() is deprecated, use actor.skills.${longForm}.check.roll() instead`
                );
                const label = game.i18n.format("PF2E.SkillCheckWithName", {
                    skillName: game.i18n.localize(CONFIG.PF2E.skills[shortForm]),
                });
                const rollOptions = new Set(params.options ?? []);
                ensureProficiencyOption(rollOptions, skill.rank);

                // Get just-in-time roll options from rule elements
                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    rule.beforeRoll?.(domains, rollOptions);
                }

                const rollTwice = extractRollTwice(synthetics.rollTwice, domains, rollOptions);
                const substitutions = extractRollSubstitutions(synthetics.rollSubstitutions, domains, rollOptions);
                const context: CheckRollContext = {
                    actor: this,
                    type: "skill-check",
                    options: rollOptions,
                    dc: params.dc,
                    rollTwice,
                    substitutions,
                    notes: stat.notes,
                    dosAdjustments: extractDegreeOfSuccessAdjustments(synthetics, domains),
                };

                const roll = await CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    context,
                    params.event,
                    params.callback
                );

                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                }

                return roll;
            };

            builtSkills[shortForm] = stat;
            return builtSkills;
        }, {} as Record<SkillAbbreviation, CharacterSkillData>);

        // Lore skills
        for (const loreItem of this.itemTypes.lore) {
            // normalize skill name to lower-case and dash-separated words
            const shortForm = sluggify(loreItem.name) as SkillAbbreviation;
            const rank = loreItem.system.proficient.value;

            const domains = [shortForm, "int-based", "skill-check", "lore-skill-check", "int-skill-check", "all"];
            const modifiers = [
                createAbilityModifier({ actor: this, ability: "int", domains }),
                createProficiencyModifier({ actor: this, rank, domains }),
                ...extractModifiers(synthetics, domains),
            ];

            const loreSkill = systemData.skills[shortForm];
            const stat = mergeObject(
                new StatisticModifier(shortForm, modifiers, this.getRollOptions(domains)),
                loreSkill,
                { overwrite: false }
            );
            const additionalData = {
                itemID: loreItem.id,
                shortform: shortForm,
                expanded: loreItem,
                lore: true,
            };

            stat.label = loreItem.name;
            stat.ability = "int";
            stat.notes = extractNotes(synthetics.rollNotes, domains);
            stat.rank = rank ?? 0;
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            stat.roll = async (params: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                console.warn(
                    `Rolling skill checks via actor.system.skills.${shortForm}.roll() is deprecated, use actor.skills.${shortForm}.check.roll() instead`
                );
                const label = game.i18n.format("PF2E.SkillCheckWithName", { skillName: loreItem.name });
                const rollOptions = new Set(params.options ?? []);
                ensureProficiencyOption(rollOptions, rank);

                // Get just-in-time roll options from rule elements
                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    rule.beforeRoll?.(domains, rollOptions);
                }

                const rollTwice = extractRollTwice(synthetics.rollTwice, domains, rollOptions);
                const substitutions = extractRollSubstitutions(synthetics.rollSubstitutions, domains, rollOptions);
                const context: CheckRollContext = {
                    actor: this,
                    type: "skill-check",
                    options: rollOptions,
                    dc: params.dc,
                    rollTwice,
                    substitutions,
                    notes: stat.notes,
                    dosAdjustments: extractDegreeOfSuccessAdjustments(synthetics, domains),
                };

                const roll = await CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    context,
                    params.event,
                    params.callback
                );

                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                }

                return roll;
            };

            skills[shortForm] = mergeObject(stat, additionalData);
        }

        return skills;
    }

    override prepareSpeed(movementType: "land"): CreatureSpeeds;
    override prepareSpeed(movementType: Exclude<MovementType, "land">): (LabeledSpeed & StatisticModifier) | null;
    override prepareSpeed(movementType: MovementType): CreatureSpeeds | (LabeledSpeed & StatisticModifier) | null;
    override prepareSpeed(movementType: MovementType): CreatureSpeeds | (LabeledSpeed & StatisticModifier) | null {
        const { wornArmor } = this;
        const basePenalty = wornArmor?.speedPenalty ?? 0;
        const strength = this.system.abilities.str.value;
        const requirement = wornArmor?.strength ?? strength;
        const value = strength >= requirement ? Math.min(basePenalty + 5, 0) : basePenalty;

        const modifierName = wornArmor?.name ?? "PF2E.ArmorSpeedLabel";
        const slug = "armor-speed-penalty";
        const armorPenalty = value
            ? new ModifierPF2e({
                  slug,
                  label: modifierName,
                  modifier: value,
                  type: MODIFIER_TYPE.UNTYPED,
                  adjustments: extractModifierAdjustments(
                      this.synthetics.modifierAdjustments,
                      ["speed", `${movementType}-speed`],
                      slug
                  ),
              })
            : null;
        if (armorPenalty) {
            const speedModifiers = (this.synthetics.statisticsModifiers["speed"] ??= []);
            armorPenalty.predicate.push({ not: "armor:ignore-speed-penalty" });
            armorPenalty.test(this.getRollOptions(["speed", `${movementType}-speed`]));
            speedModifiers.push(() => armorPenalty);
        }

        return super.prepareSpeed(movementType);
    }

    prepareFeats(): void {
        this.pfsBoons = [];
        this.deityBoonsCurses = [];
        this.feats = new CharacterFeats(this);

        const campaignFeatSections = game.settings.get("pf2e", "campaignFeatSections");
        for (const section of campaignFeatSections) {
            this.feats.createCategory(section);
        }

        this.feats.assignFeats();

        // These are not handled by character feats
        const feats = this.itemTypes.feat
            .filter((f) => ["pfsboon", "deityboon", "curse"].includes(f.featType))
            .sort((f1, f2) => f1.sort - f2.sort);
        for (const feat of feats) {
            if (feat.featType === "pfsboon") {
                this.pfsBoons.push(feat);
            } else {
                this.deityBoonsCurses.push(feat);
            }
        }
    }

    prepareClassDC(slug: string, classDC: Pick<ClassDCData, "label" | "ability" | "rank" | "primary">): Statistic {
        classDC.ability ??= "str";
        classDC.rank ??= 0;
        classDC.primary ??= false;
        return new Statistic(this, {
            slug,
            label: classDC.label,
            ability: classDC.ability,
            rank: classDC.rank,
            domains: ["class", slug, `${classDC.ability}-based`, "all"],
            check: { type: "check" },
        });
    }

    /** Create an "auxiliary" action, an Interact or Release action using a weapon */
    createAuxAction({ weapon, action, purpose, hands }: CreateAuxiliaryParams): AuxiliaryAction {
        // A variant title reflects the options to draw, pick up, or retrieve a weapon with one or two hands */
        const [actions, carryType, fullPurpose] = ((): [ZeroToThree, ItemCarryType, string] => {
            switch (purpose) {
                case "Draw":
                    return [1, "held", `${purpose}${hands}H`];
                case "PickUp":
                    return [1, "held", `${purpose}${hands}H`];
                case "Retrieve":
                    return [weapon.container?.isHeld ? 2 : 3, "held", `${purpose}${hands}H`];
                case "Grip":
                    return [action === "Interact" ? 1 : 0, "held", purpose];
                case "Sheathe":
                    return [1, "worn", purpose];
                case "Drop":
                    return [0, "dropped", purpose];
            }
        })();
        const actionGlyph = getActionGlyph(actions);

        return {
            label: game.i18n.localize(`PF2E.Actions.${action}.${fullPurpose}.Title`),
            img: actionGlyph,
            execute: async (): Promise<void> => {
                await this.adjustCarryType(weapon, carryType, hands);

                if (!game.combat) return; // Only send out messages if in encounter mode

                const templates = {
                    flavor: "./systems/pf2e/templates/chat/action/flavor.html",
                    content: "./systems/pf2e/templates/chat/action/content.html",
                };

                const flavorAction = {
                    title: `PF2E.Actions.${action}.Title`,
                    subtitle: `PF2E.Actions.${action}.${fullPurpose}.Title`,
                    typeNumber: actionGlyph,
                };

                const flavor = await renderTemplate(templates.flavor, {
                    action: flavorAction,
                    traits: [
                        {
                            name: CONFIG.PF2E.featTraits.manipulate,
                            description: CONFIG.PF2E.traitsDescriptions.manipulate,
                        },
                    ],
                });

                const content = await renderTemplate(templates.content, {
                    imgPath: weapon.img,
                    message: game.i18n.format(`PF2E.Actions.${action}.${fullPurpose}.Description`, {
                        actor: this.name,
                        weapon: weapon.name,
                    }),
                });

                await ChatMessagePF2e.create({
                    content,
                    speaker: ChatMessagePF2e.getSpeaker({ actor: this }),
                    flavor,
                    type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
                });
            },
        };
    }

    /** Prepare this character's strike actions */
    prepareStrikes({ includeBasicUnarmed = true } = {}): CharacterStrike[] {
        const { itemTypes, synthetics } = this;

        // Acquire the character's handwraps of mighty blows and apply its runes to all unarmed attacks
        const handwrapsSlug = "handwraps-of-mighty-blows";
        const handwraps = itemTypes.weapon.find(
            (w) => w.slug === handwrapsSlug && w.category === "unarmed" && w.isEquipped
        );
        const unarmedRunes = ((): DeepPartial<WeaponSystemSource> | null => {
            const { potencyRune, strikingRune, propertyRune1, propertyRune2, propertyRune3, propertyRune4 } =
                handwraps?._source.system ?? {};
            return handwraps?.isInvested
                ? deepClone({
                      potencyRune,
                      strikingRune,
                      propertyRune1,
                      propertyRune2,
                      propertyRune3,
                      propertyRune4,
                  })
                : null;
        })();

        // Add a basic unarmed strike
        const basicUnarmed = includeBasicUnarmed
            ? ((): Embedded<WeaponPF2e> => {
                  const source: PreCreate<WeaponSource> & { system: { damage?: Partial<WeaponDamage> } } = {
                      _id: "xxPF2ExUNARMEDxx",
                      name: game.i18n.localize("PF2E.WeaponTypeUnarmed"),
                      type: "weapon",
                      img: "systems/pf2e/icons/features/classes/powerful-fist.webp",
                      system: {
                          slug: "basic-unarmed",
                          category: "unarmed",
                          baseItem: null,
                          bonus: { value: 0 },
                          damage: { dice: 1, die: "d4", damageType: "bludgeoning" },
                          equipped: {
                              carryType: "worn",
                              inSlot: true,
                              handsHeld: 0,
                          },
                          group: "brawling",
                          traits: { value: ["agile", "finesse", "nonlethal", "unarmed"] },
                          usage: { value: "worngloves" },
                          ...(unarmedRunes ?? {}),
                      },
                  };

                  // No handwraps, so generate straight from source
                  return new WeaponPF2e(source, { parent: this, pf2e: { ready: true } }) as Embedded<WeaponPF2e>;
              })()
            : null;

        // Regenerate unarmed strikes from handwraps so that all runes are included
        if (unarmedRunes) {
            for (const [slug, weapon] of synthetics.strikes.entries()) {
                if (weapon.category === "unarmed") {
                    synthetics.strikes.set(slug, weapon.clone({ system: unarmedRunes }, { keepId: true }));
                }

                // Prevent synthetic strikes from being renamed by runes
                const clone = synthetics.strikes.get(slug)!;
                clone.name = clone._source.name;
            }
        }

        const ammos = itemTypes.consumable.filter((i) => i.consumableType === "ammo" && !i.isStowed);
        const homebrewCategoryTags = game.settings.get("pf2e", "homebrew.weaponCategories");
        const offensiveCategories = [...WEAPON_CATEGORIES, ...homebrewCategoryTags.map((tag) => tag.id)];

        // Exclude handwraps as a strike
        const weapons = [
            itemTypes.weapon.filter((w) => w.slug !== handwrapsSlug),
            Array.from(synthetics.strikes.values()),
            basicUnarmed ?? [],
        ].flat();

        return weapons.map((w) => this.prepareStrike(w, { categories: offensiveCategories, ammos }));
    }

    /** Prepare a strike action from a weapon */
    private prepareStrike(
        weapon: Embedded<WeaponPF2e>,
        options: {
            categories: WeaponCategory[];
            ammos?: Embedded<ConsumablePF2e>[];
            defaultAbility?: AbilityString;
        }
    ): CharacterStrike {
        const { synthetics } = this;
        const modifiers: ModifierPF2e[] = [];
        const systemData = this.system;
        const { categories } = options;
        const ammos = options.ammos ?? [];

        // Apply strike adjustments affecting the weapon
        for (const adjustment of synthetics.strikeAdjustments) {
            adjustment.adjustWeapon?.(weapon);
        }
        const weaponRollOptions = weapon.getRollOptions("item");
        const weaponTraits = weapon.traits;

        // If the character has an ancestral weapon familiarity or similar feature, it will make weapons that meet
        // certain criteria also count as weapon of different category
        const categoryRank = systemData.martial[weapon.category]?.rank ?? 0;
        const groupRank = systemData.martial[`weapon-group-${weapon.group}`]?.rank ?? 0;

        // Weapons that are interchangeable for all rules purposes (e.g., longbow and composite longbow)
        const equivalentWeapons: Record<string, string | undefined> = CONFIG.PF2E.equivalentWeapons;
        const baseWeapon = equivalentWeapons[weapon.baseType ?? ""] ?? weapon.baseType;
        const baseWeaponRank = systemData.martial[`weapon-base-${baseWeapon}`]?.rank ?? 0;

        // If a weapon matches against a linked proficiency, temporarily add the `sameAs` category to the weapon's
        // item roll options
        const equivalentCategories = Object.values(systemData.martial).flatMap((p) =>
            "sameAs" in p && p.definition.test(weaponRollOptions) ? `item:category:${p.sameAs}` : []
        );
        const weaponProficiencyOptions = new Set(weaponRollOptions.concat(equivalentCategories));

        const syntheticRanks = Object.values(systemData.martial)
            .filter((p): p is MartialProficiency => "definition" in p && p.definition.test(weaponProficiencyOptions))
            .map((p) => p.rank);

        const unarmedOrWeapon = weapon.category === "unarmed" ? "unarmed" : "weapon";
        const meleeOrRanged = weapon.isMelee ? "melee" : "ranged";
        const slug = weapon.slug ?? sluggify(weapon.name);

        const weaponSpecificSelectors = [
            weapon.baseType ? `${weapon.baseType}-base-attack-roll` : [],
            weapon.group ? `${weapon.group}-group-attack-roll` : [],
            weapon.system.traits.otherTags.map((t) => `${t}-tag-attack-roll`),
        ].flat();

        const baseSelectors = [
            ...weaponSpecificSelectors,
            "attack",
            "mundane-attack",
            `${weapon.id}-attack`,
            `${slug}-attack`,
            `${slug}-attack-roll`,
            "strike-attack-roll",
            `${unarmedOrWeapon}-attack-roll`,
            `${meleeOrRanged}-attack-roll`,
            "attack-roll",
            "all",
        ];

        // Determine the default ability and score for this attack.
        const defaultAbility = options.defaultAbility ?? (weapon.isMelee ? "str" : "dex");
        modifiers.push(createAbilityModifier({ actor: this, ability: defaultAbility, domains: baseSelectors }));
        if (weapon.isMelee && weaponTraits.has("finesse")) {
            modifiers.push(createAbilityModifier({ actor: this, ability: "dex", domains: baseSelectors }));
        }
        if (weapon.isRanged && weaponTraits.has("brutal")) {
            modifiers.push(createAbilityModifier({ actor: this, ability: "str", domains: baseSelectors }));
        }

        const proficiencyRank = Math.max(categoryRank, groupRank, baseWeaponRank, ...syntheticRanks) as ZeroToFour;
        weaponRollOptions.push(`item:proficiency:rank:${proficiencyRank}`);
        modifiers.push(createProficiencyModifier({ actor: this, rank: proficiencyRank, domains: baseSelectors }));

        const baseOptions = new Set([
            ...this.getRollOptions(baseSelectors),
            ...weaponTraits, // always add weapon traits as options
            ...weaponRollOptions,
            meleeOrRanged,
        ]);
        ensureProficiencyOption(baseOptions, proficiencyRank);

        // Determine the ability-based synthetic selectors according to the prevailing ability modifier
        const selectors = (() => {
            const options = { resolvables: { weapon } };
            const abilityModifier = [...modifiers, ...extractModifiers(synthetics, baseSelectors, options)]
                .filter((m): m is ModifierPF2e & { ability: AbilityString } => m.type === "ability")
                .flatMap((modifier) => (modifier.predicate.test(baseOptions) ? modifier : []))
                .reduce((best, candidate) => (candidate.modifier > best.modifier ? candidate : best));

            if (!abilityModifier) {
                console.warn(
                    `PF2e System | No ability modifier was determined for attack roll with ${weapon.name} (${weapon.uuid})`
                );
                return baseSelectors;
            }

            const ability = abilityModifier.ability;

            return [
                baseSelectors,
                baseWeapon && !baseWeapon.includes(`${baseWeapon}-attack`) ? `${baseWeapon}-attack` : [],
                weapon.group ? `${weapon.group}-weapon-group-attack` : [],
                `${ability}-attack`,
                `${ability}-based`,
            ].flat();
        })();

        // Extract weapon roll notes
        const attackRollNotes = extractNotes(synthetics.rollNotes, selectors);
        const ABP = game.pf2e.variantRules.AutomaticBonusProgression;

        if (weapon.group === "bomb" && !ABP.isEnabled) {
            const attackBonus = Number(weapon.system.bonus?.value) || 0;
            if (attackBonus !== 0) {
                modifiers.push(new ModifierPF2e("PF2E.ItemBonusLabel", attackBonus, MODIFIER_TYPE.ITEM));
            }
        }

        // Get best weapon potency
        const weaponPotency = (() => {
            const potency = selectors
                .flatMap((key) => deepClone(synthetics.weaponPotency[key] ?? []))
                .filter((wp) => PredicatePF2e.test(wp.predicate, baseOptions));
            ABP.applyPropertyRunes(potency, weapon);
            const potencyRune = weapon.system.runes.potency;

            if (potencyRune) {
                const property = getPropertyRunes(weapon, getPropertySlots(weapon)).filter(
                    (r): r is WeaponPropertyRuneType => setHasElement(WEAPON_PROPERTY_RUNE_TYPES, r)
                );
                potency.push({
                    label: "PF2E.PotencyRuneLabel",
                    bonus: potencyRune,
                    type: "item",
                    property,
                    predicate: new PredicatePF2e(),
                });
            }
            return potency.length > 0
                ? potency.reduce((highest, current) => (highest.bonus > current.bonus ? highest : current))
                : null;
        })();

        if (weaponPotency) {
            modifiers.push(new ModifierPF2e(weaponPotency.label, weaponPotency.bonus, weaponPotency.type));
            weaponTraits.add("magical");
        }

        const shoddyPenalty = createShoddyPenalty(this, weapon, selectors);
        if (shoddyPenalty) modifiers.push(shoddyPenalty);

        // Everything from relevant synthetics
        modifiers.push(
            ...extractModifiers(synthetics, selectors, { injectables: { weapon }, resolvables: { weapon } })
        );

        // Multiple attack penalty
        const multipleAttackPenalty = calculateMAPs(weapon, { domains: selectors, options: baseOptions });

        const auxiliaryActions: AuxiliaryAction[] = [];
        const isRealItem = this.items.has(weapon.id);

        if (isRealItem && weapon.category !== "unarmed") {
            const traitsArray = weapon.system.traits.value;
            const hasFatalAimTrait = traitsArray.some((t) => t.startsWith("fatal-aim"));
            const hasTwoHandTrait = traitsArray.some((t) => t.startsWith("two-hand"));
            const { usage } = weapon.system;
            const canWield2H = (usage.type === "held" && usage.hands === 2) || hasFatalAimTrait || hasTwoHandTrait;

            switch (weapon.carryType) {
                case "held": {
                    if (weapon.handsHeld === 2) {
                        auxiliaryActions.push(
                            this.createAuxAction({ weapon, action: "Release", purpose: "Grip", hands: 1 })
                        );
                    } else if (weapon.handsHeld === 1 && canWield2H) {
                        auxiliaryActions.push(
                            this.createAuxAction({ weapon, action: "Interact", purpose: "Grip", hands: 2 })
                        );
                    }
                    auxiliaryActions.push(
                        this.createAuxAction({ weapon, action: "Interact", purpose: "Sheathe", hands: 0 })
                    );
                    auxiliaryActions.push(
                        this.createAuxAction({ weapon, action: "Release", purpose: "Drop", hands: 0 })
                    );
                    break;
                }
                case "worn": {
                    if (canWield2H) {
                        auxiliaryActions.push(
                            this.createAuxAction({ weapon, action: "Interact", purpose: "Draw", hands: 2 })
                        );
                    }
                    auxiliaryActions.push(
                        this.createAuxAction({ weapon, action: "Interact", purpose: "Draw", hands: 1 })
                    );
                    break;
                }
                case "stowed": {
                    auxiliaryActions.push(
                        this.createAuxAction({ weapon, action: "Interact", purpose: "Retrieve", hands: 1 })
                    );
                    break;
                }
                case "dropped": {
                    if (canWield2H) {
                        auxiliaryActions.push(
                            this.createAuxAction({ weapon, action: "Interact", purpose: "PickUp", hands: 2 })
                        );
                    }
                    auxiliaryActions.push(
                        this.createAuxAction({ weapon, action: "Interact", purpose: "PickUp", hands: 1 })
                    );
                    break;
                }
            }
        }

        const flavor = this.getStrikeDescription(weapon);
        const rollOptions = [...this.getRollOptions(selectors), ...weaponRollOptions, ...weaponTraits, meleeOrRanged];
        const strikeStat = new StatisticModifier(`${slug}-strike`, modifiers, rollOptions);
        const altUsages = weapon.getAltUsages().map((w) => this.prepareStrike(w, { categories }));

        const action: CharacterStrike = mergeObject(strikeStat, {
            label: weapon.name,
            imageUrl: weapon.img,
            quantity: weapon.quantity,
            slug: weapon.slug,
            ready: weapon.isEquipped,
            visible: weapon.slug !== "basic-unarmed" || this.flags.pf2e.showBasicUnarmed,
            glyph: "A",
            item: weapon,
            type: "strike" as const,
            ...flavor,
            options: weapon.system.options?.value ?? [],
            traits: [],
            weaponTraits: Array.from(weaponTraits).map((t) => traitSlugToObject(t, CONFIG.PF2E.npcAttackTraits)),
            variants: [],
            selectedAmmoId: weapon.system.selectedAmmoId,
            altUsages,
            auxiliaryActions,
        });

        // Define these as getters so that Foundry's TokenDocument#getBarAttribute method doesn't recurse infinitely
        Object.defineProperty(action, "origin", {
            get: () => this.items.get(weapon.id),
        });

        // Show the ammo list if the weapon requires ammo
        if (weapon.requiresAmmo) {
            const compatible = ammos.filter((a) => a.isAmmoFor(weapon));
            const incompatible = ammos.filter((a) => !a.isAmmoFor(weapon));
            const ammo = weapon.ammo;
            const selected = ammo ? { id: ammo.id, compatible: ammo.isAmmoFor(weapon) } : null;

            action.ammunition = { compatible, incompatible, selected };
        }

        const actionTraits: ActionTrait[] = [
            "attack" as const,
            // CRB p. 544: "Due to the complexity involved in preparing bombs, Strikes to throw alchemical bombs gain
            // the manipulate trait."
            weapon.baseType === "alchemical-bomb" ? ("manipulate" as const) : [],
        ].flat();
        for (const adjustment of synthetics.strikeAdjustments) {
            adjustment.adjustTraits?.(weapon, actionTraits);
        }
        action.traits = actionTraits.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits));

        action.breakdown = action.modifiers
            .filter((m) => m.enabled)
            .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
            .join(", ");

        const checkName = game.i18n.format(
            weapon.isMelee ? "PF2E.Action.Strike.MeleeLabel" : "PF2E.Action.Strike.RangedLabel",
            { weapon: weapon.name }
        );

        const noMAPLabel = ((): string => {
            const strike = game.i18n.localize("PF2E.WeaponStrikeLabel");
            const value = action.totalModifier;
            const sign = value < 0 ? "" : "+";
            return `${strike} ${sign}${value}`;
        })();

        const labels: [string, string, string] = [
            noMAPLabel,
            game.i18n.format("PF2E.MAPAbbreviationLabel", { penalty: multipleAttackPenalty.map1 }),
            game.i18n.format("PF2E.MAPAbbreviationLabel", { penalty: multipleAttackPenalty.map2 }),
        ];
        const checkModifiers = [
            (otherModifiers: ModifierPF2e[]) => new CheckModifier(checkName, action, otherModifiers),
            (otherModifiers: ModifierPF2e[]) =>
                new CheckModifier(checkName, action, [
                    ...otherModifiers,
                    new ModifierPF2e(multipleAttackPenalty.label, multipleAttackPenalty.map1, MODIFIER_TYPE.UNTYPED),
                ]),
            (otherModifiers: ModifierPF2e[]) =>
                new CheckModifier(checkName, action, [
                    ...otherModifiers,
                    new ModifierPF2e(multipleAttackPenalty.label, multipleAttackPenalty.map2, MODIFIER_TYPE.UNTYPED),
                ]),
        ];

        action.variants = [0, 1, 2]
            .map((index): [string, (otherModifiers: ModifierPF2e[]) => CheckModifier] => [
                labels[index],
                checkModifiers[index],
            ])
            .map(([label, constructModifier]) => ({
                label,
                roll: async (params: StrikeRollParams = {}): Promise<Rolled<CheckRoll> | null> => {
                    if (weapon.requiresAmmo && !weapon.ammo) {
                        ui.notifications.warn(
                            game.i18n.format("PF2E.Strike.Ranged.NoAmmo", { weapon: weapon.name, actor: this.name })
                        );
                        return null;
                    }

                    params.options ??= [];
                    const context = this.getAttackRollContext({
                        item: weapon,
                        domains: selectors,
                        options: new Set([...baseOptions, ...params.options, ...action.options]),
                        viewOnly: params.getFormula ?? false,
                    });

                    // Check whether target is out of maximum range; abort early if so
                    if (context.self.item.isRanged && typeof context.target?.distance === "number") {
                        const maxRange = context.self.item.maxRange ?? 10;
                        if (context.target.distance > maxRange) {
                            ui.notifications.warn("PF2E.Action.Strike.OutOfRange", { localize: true });
                            return null;
                        }
                    }

                    // Get just-in-time roll options from rule elements
                    for (const rule of this.rules.filter((r) => !r.ignored)) {
                        rule.beforeRoll?.(selectors, context.options);
                    }

                    const dc = params.dc ?? context.dc;

                    const rollTwice =
                        params.rollTwice || extractRollTwice(synthetics.rollTwice, selectors, context.options);
                    const substitutions = extractRollSubstitutions(
                        synthetics.rollSubstitutions,
                        selectors,
                        context.options
                    );

                    const checkContext: CheckRollContext = {
                        type: "attack-roll",
                        actor: context.self.actor,
                        target: context.target,
                        item: context.self.item,
                        altUsage: params.altUsage ?? null,
                        domains: selectors,
                        options: context.options,
                        notes: attackRollNotes,
                        dc,
                        traits: context.traits,
                        rollTwice,
                        substitutions,
                        dosAdjustments: extractDegreeOfSuccessAdjustments(synthetics, selectors),
                    };

                    if (!this.consumeAmmo(context.self.item, params)) return null;

                    const roll = await CheckPF2e.roll(
                        constructModifier(context.self.modifiers),
                        checkContext,
                        params.event,
                        params.callback
                    );

                    for (const rule of this.rules.filter((r) => !r.ignored)) {
                        await rule.afterRoll?.({ roll, selectors, domains: selectors, rollOptions: context.options });
                    }

                    return roll;
                },
            }));
        action.attack = action.roll = action.variants[0].roll;

        for (const method of ["damage", "critical"] as const) {
            action[method] = async (params: StrikeRollParams = {}): Promise<string | Rolled<DamageRoll> | null> => {
                const domains = ["all", "strike-damage", "damage-roll"];
                params.options ??= [];
                const context = this.getStrikeRollContext({
                    item: weapon,
                    viewOnly: params.getFormula ?? false,
                    domains,
                    options: new Set([...params.options, ...baseOptions, ...action.options]),
                });

                if (!context.self.item.dealsDamage) {
                    if (!params.getFormula) {
                        ui.notifications.warn("PF2E.ErrorMessage.WeaponNoDamage", { localize: true });
                        return null;
                    }
                    return "";
                }

                const damage = WeaponDamagePF2e.calculate(
                    context.self.item,
                    context.self.actor,
                    context.traits,
                    proficiencyRank,
                    context.options,
                    weaponPotency
                );
                if (!damage) return null;

                const outcome = method === "damage" ? "success" : "criticalSuccess";

                // Find a critical specialization note
                const critSpecs = context.self.actor.synthetics.criticalSpecalizations;
                if (outcome === "criticalSuccess" && !params.getFormula && critSpecs.standard.length > 0) {
                    // If an alternate critical specialization effect is available, apply it only if there is also a
                    // qualifying non-alternate
                    const standard = critSpecs.standard
                        .flatMap((cs): RollNotePF2e | never[] => cs(context.self.item, context.options) ?? [])
                        .pop();
                    const alternate = critSpecs.alternate
                        .flatMap((cs): RollNotePF2e | never[] => cs(context.self.item, context.options) ?? [])
                        .pop();
                    const note = standard ? alternate ?? standard : null;

                    if (note) damage.notes.push(note);
                }

                if (params.getFormula) {
                    return new DamageRoll(damage.damage.formula[outcome]).formula;
                } else {
                    const { self, target, options } = context;
                    const damageContext: DamageRollContext = {
                        type: "damage-roll",
                        sourceType: "attack",
                        self,
                        target,
                        outcome,
                        options,
                        domains,
                    };

                    return DamagePF2e.roll(damage, damageContext, params.callback);
                }
            };
        }

        return action;
    }

    getStrikeDescription(weapon: WeaponPF2e): { description: string; criticalSuccess: string; success: string } {
        const flavor = {
            description: "PF2E.Strike.Default.Description",
            criticalSuccess: "PF2E.Strike.Default.CriticalSuccess",
            success: "PF2E.Strike.Default.Success",
        };
        const traits = weapon.traits;
        if (traits.has("unarmed")) {
            flavor.description = "PF2E.Strike.Unarmed.Description";
            flavor.success = "PF2E.Strike.Unarmed.Success";
        } else if ([...traits].some((trait) => trait.startsWith("thrown-") || trait === "combination")) {
            flavor.description = "PF2E.Strike.Combined.Description";
            flavor.success = "PF2E.Strike.Combined.Success";
        } else if (weapon.isMelee) {
            flavor.description = "PF2E.Strike.Melee.Description";
            flavor.success = "PF2E.Strike.Melee.Success";
        } else {
            flavor.description = "PF2E.Strike.Ranged.Description";
            flavor.success = "PF2E.Strike.Ranged.Success";
        }
        return flavor;
    }

    /** Possibly modify this weapon depending on its */
    override getStrikeRollContext<I extends AttackItem>(
        params: StrikeRollContextParams<I>
    ): StrikeRollContext<this, I> {
        const context = super.getStrikeRollContext(params);
        if (context.self.item.isOfType("weapon")) {
            StrikeWeaponTraits.adjustWeapon(context.self.item);
        }

        return context;
    }

    /** Create attack-roll modifiers from weapon traits */
    override getAttackRollContext<I extends AttackItem>(
        params: StrikeRollContextParams<I>
    ): AttackRollContext<this, I> {
        const context = super.getAttackRollContext(params);
        if (context.self.item.isOfType("weapon")) {
            const fromTraits = StrikeWeaponTraits.createAttackModifiers(context.self.item, params.domains);
            context.self.modifiers.push(...fromTraits);
        }

        return context;
    }

    consumeAmmo(weapon: WeaponPF2e, params: RollParameters): boolean {
        const ammo = weapon.ammo;
        if (!ammo) {
            return true;
        } else if (ammo.quantity < 1) {
            ui.notifications.warn(game.i18n.localize("PF2E.ErrorMessage.NotEnoughAmmo"));
            return false;
        } else {
            const existingCallback = params.callback;
            params.callback = async (roll: Rolled<Roll>) => {
                existingCallback?.(roll);
                await ammo.consume();
            };
            return true;
        }
    }

    /** Prepare stored and synthetic martial proficiencies */
    prepareMartialProficiencies(): void {
        const systemData = this.system;

        // Set ranks of linked proficiencies to their respective categories
        const linkedProficiencies = Object.values(systemData.martial).filter(
            (p): p is LinkedProficiency => "sameAs" in p && String(p.sameAs) in systemData.martial
        );
        for (const proficiency of linkedProficiencies) {
            const category = systemData.martial[proficiency.sameAs ?? ""];
            proficiency.rank = ((): ZeroToFour => {
                const maxRankIndex = PROFICIENCY_RANKS.indexOf(proficiency.maxRank ?? "legendary");
                return Math.min(category.rank, maxRankIndex) as ZeroToFour;
            })();
        }

        // Deduplicate proficiencies, set proficiency bonuses to all
        const allProficiencies = Object.entries(systemData.martial);
        for (const [_key, proficiency] of allProficiencies) {
            const stringDefinition = "definition" in proficiency ? sortedStringify(proficiency.definition) : null;
            const duplicates = allProficiencies.flatMap(([k, p]) =>
                proficiency !== p &&
                proficiency.rank >= p.rank &&
                "definition" in proficiency &&
                "definition" in p &&
                proficiency.sameAs === p.sameAs &&
                sortedStringify(p.definition) === stringDefinition
                    ? k
                    : []
            );
            for (const duplicate of duplicates) {
                delete systemData.martial[duplicate];
            }

            const proficiencyBonus = createProficiencyModifier({ actor: this, rank: proficiency.rank, domains: [] });
            proficiency.value = proficiencyBonus.modifier;
            const sign = proficiencyBonus.modifier < 0 ? "" : "+";
            proficiency.breakdown = `${proficiencyBonus.label} ${sign}${proficiencyBonus.modifier}`;
        }
    }

    /** Toggle the invested state of an owned magical item */
    async toggleInvested(itemId: string): Promise<boolean> {
        const item = this.inventory.get(itemId);
        if (!item?.traits.has("invested")) {
            throw ErrorPF2e("Unexpected error toggling item investment");
        }

        const invested = item.isInvested;

        // If investing and unequipped, equip first
        if (!invested && !item.isEquipped) {
            await this.adjustCarryType(item, item.system.usage.type, item.system.usage.hands, true);
        }

        return !!(await item.update({ "system.equipped.invested": !invested }));
    }

    /** Add a proficiency in a weapon group or base weapon */
    async addAttackProficiency(key: BaseWeaponProficiencyKey | WeaponGroupProficiencyKey): Promise<void> {
        const currentProficiencies = this.system.martial;
        if (key in currentProficiencies) return;
        const newProficiency: CharacterProficiency = { rank: 0, value: 0, breakdown: "", custom: true };
        await this.update({ [`system.martial.${key}`]: newProficiency });
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<CharacterSource>,
        options: CreatureUpdateContext<this>,
        user: UserPF2e
    ): Promise<void> {
        const systemData = this.system;

        // Clamp level, allowing for level-0 variant rule and enough room for homebrew "mythical" campaigns
        if (changed.system?.details?.level || changed.system?.build?.abilities) {
            const level = changed.system?.details?.level;
            if (typeof level?.value === "number") {
                level.value = Math.clamped(Number(level.value) || 0, 0, 30) || 0;
            }

            // Adjust hit points if level is changing
            const clone = this.clone(changed);
            const hpMaxDifference = clone.hitPoints.max - this.hitPoints.max;
            if (hpMaxDifference !== 0) {
                options.allowHPOverage = true;
                const currentHP = this.hitPoints.value;
                const newHP = Math.max(
                    currentHP + hpMaxDifference,
                    currentHP === 0 ? 0 : 1 // Refrain from killing the character merely by lowering level
                );
                changed.system = mergeObject(changed.system ?? {}, { attributes: { hp: { value: newHP } } });
            }
        }

        // Clamp Stamina and Resolve
        if (game.settings.get("pf2e", "staminaVariant")) {
            // Do not allow stamina to go over max
            if (changed.system?.attributes?.sp) {
                changed.system.attributes.sp.value = Math.clamped(
                    changed.system?.attributes?.sp?.value || 0,
                    0,
                    systemData.attributes.sp.max
                );
            }

            // Do not allow resolve to go over max
            if (changed.system?.attributes?.resolve) {
                changed.system.attributes.resolve.value = Math.clamped(
                    changed.system?.attributes?.resolve?.value || 0,
                    0,
                    systemData.attributes.resolve.max
                );
            }
        }

        // Add or remove class features as necessary, appropriate to the PC's level
        const newLevel = changed.system?.details?.level?.value ?? this.level;
        const actorClass = this.class;
        if (actorClass && newLevel !== this.level) {
            const current = this.itemTypes.feat.filter((feat) => feat.featType === "classfeature");
            if (newLevel > this.level) {
                const classFeaturesToCreate = (await actorClass.createGrantedItems({ level: newLevel })).filter(
                    (feature) =>
                        feature.system.level.value > this.level &&
                        !current.some((currentFeature) => currentFeature.sourceId === feature.flags.core?.sourceId)
                );
                await this.createEmbeddedDocuments("Item", classFeaturesToCreate, { keepId: true, render: false });
            } else if (newLevel < this.level) {
                const classFeaturestoDelete = current.filter((feat) => feat.level > newLevel).map((feat) => feat.id);
                await this.deleteEmbeddedDocuments("Item", classFeaturestoDelete, { render: false });
            }
        }

        // Constrain PFS player and character numbers
        for (const property of ["playerNumber", "characterNumber"] as const) {
            if (typeof changed.system?.pfs?.[property] === "number") {
                const [min, max] = property === "playerNumber" ? [1, 9_999_999] : [2001, 9999];
                changed.system.pfs[property] = Math.clamped(changed.system.pfs[property] || 0, min, max);
            } else if (changed.system?.pfs && changed.system.pfs[property] !== null) {
                changed.system.pfs[property] = this.system.pfs[property] ?? null;
            }
        }

        await super._preUpdate(changed, options, user);
    }

    /** Toggle between boost-driven and manual management of ability scores */
    async toggleAbilityManagement(): Promise<void> {
        if (Object.keys(this._source.system.abilities).length === 0) {
            // Add stored ability scores for manual management
            const baseAbilities = Array.from(ABILITY_ABBREVIATIONS).reduce(
                (accumulated: Record<string, { value: 10 }>, abbrev) => ({
                    ...accumulated,
                    [abbrev]: { value: 10 as const },
                }),
                {}
            );
            await this.update({ "system.abilities": baseAbilities });
        } else {
            // Delete stored ability scores for boost-driven management
            const deletions = Array.from(ABILITY_ABBREVIATIONS).reduce(
                (accumulated: Record<string, null>, abbrev) => ({
                    ...accumulated,
                    [`-=${abbrev}`]: null,
                }),
                {}
            );
            await this.update({ "system.abilities": deletions });
        }
    }
}

interface CharacterPF2e {
    readonly data: CharacterData;
    flags: CharacterFlags;
}

export { CharacterPF2e };
