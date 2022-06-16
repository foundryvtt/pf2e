import { CreaturePF2e, FamiliarPF2e } from "@actor";
import { Abilities, CreatureSpeeds, LabeledSpeed, MovementType, SkillAbbreviation } from "@actor/creature/data";
import { AttackItem, AttackRollContext, StrikeRollContext, StrikeRollContextParams } from "@actor/creature/types";
import { CharacterSource, SaveType } from "@actor/data";
import { AbilityString } from "@actor/data/base";
import { ActorSizePF2e } from "@actor/data/size";
import { calculateMAP } from "@actor/helpers";
import {
    AbilityModifier,
    CheckModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    MODIFIER_TYPE,
    ProficiencyModifier,
    StatisticModifier,
} from "@actor/modifiers";
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
import { AncestryBackgroundClassManager } from "@item/abc/manager";
import { ActionTrait } from "@item/action/data";
import { ARMOR_CATEGORIES } from "@item/armor/data";
import { FeatData, ItemSourcePF2e, PhysicalItemSource } from "@item/data";
import { ItemGrantData } from "@item/data/base";
import { ItemCarryType } from "@item/physical/data";
import { getPropertyRunes, getPropertySlots, getResiliencyBonus } from "@item/runes";
import { MAGIC_TRADITIONS } from "@item/spell/values";
import { WeaponDamage, WeaponSource, WeaponSystemSource } from "@item/weapon/data";
import { WeaponCategory, WeaponPropertyRuneType } from "@item/weapon/types";
import { WEAPON_CATEGORIES, WEAPON_PROPERTY_RUNE_TYPES } from "@item/weapon/values";
import { ActiveEffectPF2e } from "@module/active-effect";
import { ChatMessagePF2e } from "@module/chat-message";
import { PROFICIENCY_RANKS, ZeroToFour, ZeroToThree } from "@module/data";
import { RollNotePF2e } from "@module/notes";
import { MultipleAttackPenaltyPF2e } from "@module/rules/rule-element";
import { extractModifiers, extractNotes, extractRollSubstitutions, extractRollTwice } from "@module/rules/util";
import { UserPF2e } from "@module/user";
import { CheckRoll } from "@system/check/roll";
import { DamageRollContext } from "@system/damage/damage";
import { WeaponDamagePF2e } from "@system/damage/weapon";
import { CheckDC } from "@system/degree-of-success";
import { LocalizePF2e } from "@system/localize";
import { PredicatePF2e } from "@system/predication";
import { CheckPF2e, CheckRollContext, DamageRollPF2e, RollParameters, StrikeRollParams } from "@system/rolls";
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
import {
    ABILITY_ABBREVIATIONS,
    SAVE_TYPES,
    SKILL_ABBREVIATIONS,
    SKILL_DICTIONARY,
    SKILL_DICTIONARY_REVERSE,
    SKILL_EXPANDED,
} from "../data/values";
import { CraftingEntry, CraftingEntryData, CraftingFormula } from "./crafting";
import {
    AuxiliaryAction,
    BaseWeaponProficiencyKey,
    CharacterArmorClass,
    CharacterAttributes,
    CharacterData,
    CharacterProficiency,
    CharacterSaves,
    CharacterSkillData,
    CharacterStrike,
    CharacterSystemData,
    FeatSlot,
    GrantedFeat,
    LinkedProficiency,
    MagicTraditionProficiencies,
    MartialProficiencies,
    MartialProficiency,
    SlottedFeat,
    WeaponGroupProficiencyKey,
} from "./data";
import { CharacterSheetTabVisibility } from "./data/sheet";
import { CHARACTER_SHEET_TABS } from "./data/values";
import { StrikeWeaponTraits } from "./strike-weapon-traits";
import { CharacterHitPointsSummary, CharacterSkills, CreateAuxiliaryParams } from "./types";

class CharacterPF2e extends CreaturePF2e {
    /** Core singular embeds for PCs */
    ancestry!: Embedded<AncestryPF2e> | null;
    heritage!: Embedded<HeritagePF2e> | null;
    background!: Embedded<BackgroundPF2e> | null;
    class!: Embedded<ClassPF2e> | null;
    deity!: Embedded<DeityPF2e> | null;

    /** A cached reference to this PC's familiar */
    familiar: FamiliarPF2e | null = null;

    featGroups!: Record<string, FeatSlot | undefined>;
    pfsBoons!: FeatData[];
    deityBoonsCurses!: FeatData[];

    get keyAbility(): AbilityString {
        return this.data.data.details.keyability.value || "str";
    }

    /** This PC's ability scores */
    get abilities(): Abilities {
        return deepClone(this.data.data.abilities);
    }

    override get hitPoints(): CharacterHitPointsSummary {
        return {
            ...super.hitPoints,
            recoveryMultiplier: this.data.data.attributes.hp.recoveryMultiplier,
            recoveryAddend: this.data.data.attributes.hp.recoveryAddend,
        };
    }

    override get skills(): CharacterSkills {
        const skills = super.skills;
        for (const [key, skill] of Object.entries(skills)) {
            if (!skill) continue;
            const originalKey = SKILL_DICTIONARY_REVERSE[skill.slug] ?? skill.slug;
            if (!objectHasKey(this.data.data.skills, originalKey)) continue;

            const data = this.data.data.skills[originalKey];
            skills[key] = mergeObject(skill, {
                rank: data.rank,
                ability: data.ability,
                abilityModifier: data.modifiers.find((m) => m.enabled && m.type === "ability") ?? null,
            });
        }

        return skills as CharacterSkills;
    }

    get heroPoints(): { value: number; max: number } {
        return deepClone(this.data.data.resources.heroPoints);
    }

    async getCraftingFormulas(): Promise<CraftingFormula[]> {
        const { formulas } = this.data.data.crafting;
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
        return Object.values(this.data.data.crafting.entries)
            .filter((entry): entry is CraftingEntryData => CraftingEntry.isValid(entry))
            .map((entry) => new CraftingEntry(this, craftingFormulas, entry));
    }

    async getCraftingEntry(selector: string): Promise<CraftingEntry | null> {
        const craftingFormulas = await this.getCraftingFormulas();
        const craftingEntryData = this.data.data.crafting.entries[selector];
        if (CraftingEntry.isValid(craftingEntryData)) {
            return new CraftingEntry(this, craftingFormulas, craftingEntryData);
        }

        return null;
    }

    async performDailyCrafting(): Promise<void> {
        const entries = (await this.getCraftingEntries()).filter((e) => e.isDailyPrep);
        const alchemicalEntries = entries.filter((e) => e.isAlchemical);
        const reagentCost = alchemicalEntries.reduce((sum, entry) => sum + entry.reagentCost, 0);
        const reagentValue = (this.data.data.resources.crafting.infusedReagents.value || 0) - reagentCost;
        if (reagentValue < 0) {
            ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MissingReagents"));
            return;
        } else {
            await this.update({ "data.resources.crafting.infusedReagents.value": reagentValue });
        }

        // Remove infused/temp items
        for (const item of this.inventory) {
            if (item.data.data.temporary) await item.delete();
        }

        for (const entry of entries) {
            for (const prepData of entry.preparedFormulas) {
                const item: PhysicalItemSource = prepData.item.toObject();
                item.data.quantity = prepData.quantity || 1;
                item.data.temporary = true;
                item.data.size = this.ancestry?.size === "tiny" ? "tiny" : "med";

                if (
                    entry.isAlchemical &&
                    (item.type === "consumable" || item.type === "weapon" || item.type === "equipment")
                ) {
                    item.data.traits.value.push("infused");
                }
                await this.addToInventory(item);
            }
        }
    }

    async insertFeat(feat: FeatPF2e, featType: string, slotId?: string): Promise<ItemPF2e[]> {
        const group = this.featGroups[featType];
        const location = group?.slotted ? slotId ?? "" : featType;

        const resolvedFeatType = (() => {
            if (feat.featType === "archetype") {
                if (feat.data.data.traits.value.includes("skill")) {
                    return "skill";
                } else {
                    return "class";
                }
            }

            return feat.featType;
        })();

        const isFeatValidInSlot = group && (group.supported === "all" || group.supported.includes(resolvedFeatType));
        const alreadyHasFeat = this.items.has(feat.id);
        const existing = this.itemTypes.feat.filter((x) => x.data.data.location === location);

        // Handle case where its actually dragging away from a location
        if (alreadyHasFeat && feat.data.data.location && !isFeatValidInSlot) {
            return this.updateEmbeddedDocuments("Item", [{ _id: feat.id, "data.location": "" }]);
        }

        const changed: ItemPF2e[] = [];

        // If this is a new feat, create a new feat item on the actor first
        if (!alreadyHasFeat && isFeatValidInSlot) {
            const source = feat.toObject();
            source.data.location = location;
            changed.push(...(await this.createEmbeddedDocuments("Item", [source])));
        }

        // Determine what feats we have to move around
        const locationUpdates = group?.slotted ? existing.map((x) => ({ _id: x.id, "data.location": "" })) : [];
        if (alreadyHasFeat && isFeatValidInSlot) {
            locationUpdates.push({ _id: feat.id, "data.location": location });
        }

        if (locationUpdates.length > 0) {
            changed.push(...(await this.updateEmbeddedDocuments("Item", locationUpdates)));
        }

        return changed;
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
        const systemData: DeepPartial<CharacterSystemData> = this.data.data;

        // Flags
        const { flags } = this.data;
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

        // Actor document and data properties from items
        const { details } = this.data.data;
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

        // Attributes
        const attributes: DeepPartial<CharacterAttributes> = this.data.data.attributes;
        attributes.ac = {};
        attributes.classDC = { rank: 0 };
        attributes.dexCap = [{ value: Infinity, source: "" }];
        attributes.polymorphed = false;
        attributes.battleForm = false;

        const perception = (attributes.perception ??= { ability: "wis", rank: 0 });
        perception.ability = "wis";
        perception.rank ??= 0;

        attributes.doomed = { value: 0, max: 3 };
        attributes.dying = { value: 0, max: 4, recoveryDC: 10 };
        attributes.wounded = { value: 0, max: 3 };

        // Hit points
        const hitPoints = this.data.data.attributes.hp;
        hitPoints.recoveryMultiplier = 1;
        hitPoints.recoveryAddend = 0;
        attributes.ancestryhp = 0;
        attributes.classhp = 0;

        // Familiar abilities
        attributes.familiarAbilities = { value: 0 };

        // Saves and skills
        const saves: DeepPartial<CharacterSaves> = this.data.data.saves;
        for (const save of SAVE_TYPES) {
            saves[save] = {
                ability: CONFIG.PF2E.savingThrowDefaultAbilities[save],
                rank: saves[save]?.rank ?? 0,
            };
        }

        const skills = this.data.data.skills;
        for (const key of SKILL_ABBREVIATIONS) {
            const skill = skills[key];
            skill.ability = SKILL_EXPANDED[SKILL_DICTIONARY[key]].ability;
            skill.armor = ["dex", "str"].includes(skill.ability);
        }

        // Spellcasting-tradition proficiencies
        systemData.proficiencies = {
            traditions: Array.from(MAGIC_TRADITIONS).reduce(
                (accumulated: DeepPartial<MagicTraditionProficiencies>, t) => ({
                    ...accumulated,
                    [t]: { rank: 0 },
                }),
                {}
            ),
        };

        // Resources
        const { resources } = this.data.data;
        resources.heroPoints.max = 3;
        resources.investiture = { value: 0, max: 10 };

        resources.focus = mergeObject({ value: 0, max: 0 }, resources.focus ?? {});
        resources.focus.max = 0;

        resources.crafting = mergeObject({ infusedReagents: { value: 0, max: 0 } }, resources.crafting ?? {});
        resources.crafting.infusedReagents.max = 0;

        // Size
        this.data.data.traits.size = new ActorSizePF2e({ value: "med" });

        // Alliance
        this.data.data.details.alliance = this.hasPlayerOwner ? "party" : "opposition";

        // Weapon and Armor category proficiencies
        const martial: DeepPartial<MartialProficiencies> = this.data.data.martial;
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
        for (const formula of this.data.data.crafting.formulas) {
            formula.deletable = true;
        }

        // PC level is never a derived number, so it can be set early
        this.rollOptions.all[`self:level:${this.level}`] = true;
    }

    /** After AE-likes have been applied, compute ability modifiers and set numeric roll options */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();

        for (const ability of Object.values(this.data.data.abilities)) {
            ability.mod = Math.floor((ability.value - 10) / 2);
        }
        this.setNumericRollOptions();
        this.deity?.setFavoredWeaponRank();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const systemData = this.data.data;
        const { synthetics } = this;

        if (!this.data.flags.pf2e.disableABP) {
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

        // Set dying, doomed, and wounded statuses according to embedded conditions
        for (const conditionName of ["dying", "doomed", "wounded"] as const) {
            const condition = itemTypes.condition.find((condition) => condition.slug === conditionName);
            const status = systemData.attributes[conditionName];
            status.value = Math.min(condition?.value ?? 0, status.max);
        }

        // PFS Level Bump - check and DC modifiers
        if (systemData.pfs.levelBump) {
            const modifiersAll = (statisticsModifiers.all ??= []);
            modifiersAll.push(() => new ModifierPF2e("PF2E.PFS.LevelBump", 1, MODIFIER_TYPE.UNTYPED));
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

                const conLevelBonus = systemData.abilities.con.mod * this.level;
                modifiers.push(
                    new ModifierPF2e({
                        slug: "hp-con",
                        label: "PF2E.AbilityCon",
                        ability: "con",
                        type: MODIFIER_TYPE.ABILITY,
                        modifier: conLevelBonus,
                        adjustments: this.getModifierAdjustments(["con-based"], "hp-con"),
                    })
                );
            }

            const hpRollOptions = this.getRollOptions(["hp"]);
            modifiers.push(...extractModifiers(statisticsModifiers, ["hp"], { test: hpRollOptions }));

            const perLevelRollOptions = this.getRollOptions(["hp-per-level"]);
            modifiers.push(
                ...extractModifiers(statisticsModifiers, ["hp-per-level"], { test: perLevelRollOptions }).map(
                    (clone) => {
                        clone.modifier *= this.level;
                        return clone;
                    }
                )
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
        }

        this.prepareFeats();
        this.prepareSaves();
        this.prepareMartialProficiencies();

        // Perception
        {
            const proficiencyRank = systemData.attributes.perception.rank || 0;
            const modifiers = [
                AbilityModifier.fromScore("wis", systemData.abilities.wis.value),
                ProficiencyModifier.fromLevelAndRank(this.level, proficiencyRank),
            ];

            const domains = ["perception", "wis-based", "all"];
            modifiers.push(...extractModifiers(statisticsModifiers, domains));

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
            stat.roll = async (args: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                const label = game.i18n.localize("PF2E.PerceptionCheck");
                const rollOptions = args.options ?? [];
                ensureProficiencyOption(rollOptions, proficiencyRank);
                if (args.dc && stat.adjustments) {
                    args.dc.adjustments = stat.adjustments;
                }

                // Get just-in-time roll options from rule elements
                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    rule.beforeRoll?.(domains, rollOptions);
                }

                const rollTwice = extractRollTwice(synthetics.rollTwice, domains, rollOptions);
                const context: CheckRollContext = {
                    actor: this,
                    type: "perception-check",
                    options: rollOptions,
                    dc: args.dc,
                    rollTwice,
                    notes: stat.notes,
                };

                const roll = await CheckPF2e.roll(new CheckModifier(label, stat), context, args.event, args.callback);

                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                }

                return roll;
            };

            systemData.attributes.perception = stat;
        }

        // Senses
        this.data.data.traits.senses = this.prepareSenses(this.data.data.traits.senses, synthetics);

        // Class DC
        {
            const domains = ["class", `${systemData.details.keyability.value}-based`, "all"];
            const modifiers = [
                AbilityModifier.fromScore(
                    systemData.details.keyability.value,
                    systemData.abilities[systemData.details.keyability.value].value
                ),
                ProficiencyModifier.fromLevelAndRank(this.level, systemData.attributes.classDC.rank ?? 0),
                ...extractModifiers(statisticsModifiers, domains),
            ];

            const stat = mergeObject(
                new StatisticModifier("class", modifiers, this.getRollOptions(domains)),
                systemData.attributes.classDC,
                { overwrite: false }
            );
            stat.notes = extractNotes(rollNotes, domains);
            stat.value = 10 + stat.totalModifier;
            stat.ability = systemData.details.keyability.value;
            stat.breakdown = [game.i18n.localize("PF2E.ClassDCBase")]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                )
                .join(", ");

            systemData.attributes.classDC = stat;
        }

        // Armor Class
        const { wornArmor, heldShield } = this;
        {
            const modifiers = [this.getShieldBonus() ?? []].flat();
            const dexCapSources = systemData.attributes.dexCap;
            let armorCheckPenalty = 0;
            const proficiency = wornArmor?.category ?? "unarmored";

            if (wornArmor && wornArmor.acBonus > 0) {
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
                        type: MODIFIER_TYPE.ITEM,
                        slug,
                        modifier: wornArmor.acBonus,
                        adjustments: this.getModifierAdjustments(["all", "ac"], slug),
                    })
                );
            }

            // Proficiency bonus
            modifiers.unshift(
                ProficiencyModifier.fromLevelAndRank(this.level, systemData.martial[proficiency]?.rank ?? 0)
            );

            // DEX modifier is limited by the lowest cap, usually from armor
            const dexterity = AbilityModifier.fromScore("dex", systemData.abilities.dex.value);
            const dexCap = dexCapSources.reduce((lowest, candidate) =>
                lowest.value > candidate.value ? candidate : lowest
            );
            dexterity.modifier = Math.min(dexterity.modifier, dexCap.value);
            modifiers.unshift(dexterity);

            // In case an ability other than DEX is added, find the best ability modifier and use that as the ability on
            // which AC is based
            const abilityModifier = modifiers
                .filter((m) => m.type === "ability" && !!m.ability)
                .reduce((best, modifier) => (modifier.modifier > best.modifier ? modifier : best), dexterity);
            const acAbility = abilityModifier.ability!;
            const domains = ["ac", `${acAbility}-based`];
            modifiers.push(...extractModifiers(statisticsModifiers, ["all", ...domains]));

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
            speedPenalty.predicate.not = ["self:shield:ignore-speed-penalty"];
            statisticsModifiers.speed ??= [];
            statisticsModifiers.speed.push(() => speedPenalty);
        }

        // Skills
        systemData.skills = this.prepareSkills();

        // Speeds
        systemData.attributes.speed = this.prepareSpeed("land");
        const { otherSpeeds } = systemData.attributes.speed;
        for (let idx = 0; idx < otherSpeeds.length; idx++) {
            otherSpeeds[idx] = this.prepareSpeed(otherSpeeds[idx].type);
        }

        systemData.actions = this.prepareStrikes();

        systemData.actions.sort((l, r) => {
            if (l.ready !== r.ready) return (l.ready ? 0 : 1) - (r.ready ? 0 : 1);
            return (l.weapon?.data.sort ?? 0) - (r.weapon?.data.sort ?? 0);
        });

        // Spellcasting Entries
        for (const entry of itemTypes.spellcastingEntry) {
            const { ability, tradition } = entry;
            const rank = (entry.data.data.proficiency.value = entry.rank);

            const baseSelectors = ["all", `${ability}-based`, "spell-attack-dc"];
            const attackSelectors = [
                `${tradition}-spell-attack`,
                "spell-attack",
                "spell-attack-roll",
                "attack",
                "attack-roll",
            ];
            const saveSelectors = [`${tradition}-spell-dc`, "spell-dc"];

            // assign statistic data to the spellcasting entry
            entry.statistic = new Statistic(this, {
                slug: sluggify(entry.name),
                label: CONFIG.PF2E.magicTraditions[tradition],
                ability: entry.ability,
                rank,
                modifiers: extractModifiers(statisticsModifiers, baseSelectors),
                notes: extractNotes(rollNotes, [...baseSelectors, ...attackSelectors]),
                domains: baseSelectors,
                rollOptions: entry.getRollOptions("spellcasting"),
                check: {
                    type: "spell-attack-roll",
                    modifiers: extractModifiers(statisticsModifiers, attackSelectors),
                    domains: attackSelectors,
                },
                dc: {
                    modifiers: extractModifiers(statisticsModifiers, saveSelectors),
                    domains: saveSelectors,
                },
            });

            entry.data.data.statisticData = entry.statistic.getChatData();
        }

        // Expose best spellcasting dc to character attributes
        if (itemTypes.spellcastingEntry.length > 0) {
            const best = itemTypes.spellcastingEntry.reduce((previous, current) => {
                return current.statistic.dc.value > previous.statistic.dc.value ? current : previous;
            });
            this.data.data.attributes.spellDC = { rank: best.statistic.rank ?? 0, value: best.statistic.dc.value };
        } else {
            this.data.data.attributes.spellDC = null;
        }

        // Expose the higher between highest spellcasting DC and (if present) class DC
        this.data.data.attributes.classOrSpellDC = ((): { rank: number; value: number } => {
            const classDC = this.data.data.attributes.classDC.rank > 0 ? this.data.data.attributes.classDC : null;
            const spellDC = this.data.data.attributes.spellDC;
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
        const { focus, crafting } = this.data.data.resources;
        focus.max = Math.clamped(focus.max, 0, 3);
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

    /** Set roll operations for ability scores, proficiency ranks, and number of hands free */
    protected setNumericRollOptions(): void {
        const rollOptionsAll = this.rollOptions.all;

        const perceptionRank = this.data.data.attributes.perception.rank;
        rollOptionsAll[`perception:rank:${perceptionRank}`] = true;

        for (const key of ABILITY_ABBREVIATIONS) {
            const score = this.abilities[key].value;
            rollOptionsAll[`ability:${key}:score:${score}`] = true;
        }

        for (const key of SKILL_ABBREVIATIONS) {
            const rank = this.data.data.skills[key].rank;
            rollOptionsAll[`skill:${key}:rank:${rank}`] = true;
        }

        for (const key of ARMOR_CATEGORIES) {
            const rank = this.data.data.martial[key].rank;
            rollOptionsAll[`defense:${key}:rank:${rank}`] = true;
        }

        for (const key of WEAPON_CATEGORIES) {
            const rank = this.data.data.martial[key].rank;
            rollOptionsAll[`attack:${key}:rank:${rank}`] = true;
        }

        for (const key of SAVE_TYPES) {
            const rank = this.data.data.saves[key].rank;
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
        // `
    }

    private prepareSaves(): void {
        const systemData = this.data.data;
        const { wornArmor } = this;
        const { rollNotes, statisticsModifiers } = this.synthetics;

        // Saves
        const saves: Partial<Record<SaveType, Statistic>> = {};
        for (const saveType of SAVE_TYPES) {
            const save = systemData.saves[saveType];
            const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const modifiers: ModifierPF2e[] = [];

            // Add resilient bonuses for wearing armor with a resilient rune.
            if (wornArmor?.data.data.resiliencyRune.value) {
                const resilientBonus = getResiliencyBonus(wornArmor.data.data);
                if (resilientBonus > 0 && wornArmor.isInvested) {
                    modifiers.push(new ModifierPF2e(wornArmor.name, resilientBonus, MODIFIER_TYPE.ITEM));
                }
            }

            const affectedByBulwark = saveType === "reflex" && wornArmor?.traits.has("bulwark");
            if (affectedByBulwark) {
                const bulwarkModifier = new ModifierPF2e({
                    slug: "bulwark",
                    type: MODIFIER_TYPE.UNTYPED,
                    label: CONFIG.PF2E.armorTraits.bulwark,
                    modifier: 3,
                    predicate: { all: ["damaging-effect"] },
                });
                modifiers.push(bulwarkModifier);

                // Add a modifier adjustment to be picked up by the construction of this saving throw's Statistic
                const reflexAdjustments = (this.synthetics.modifierAdjustments[saveType] ??= []);
                reflexAdjustments.push({
                    slug: "dex",
                    predicate: new PredicatePF2e({ all: ["damaging-effect"] }),
                    suppress: true,
                });
            }

            // Add custom modifiers and roll notes relevant to this save.
            const selectors = [saveType, `${save.ability}-based`, "saving-throw", "all"];
            modifiers.push(...extractModifiers(statisticsModifiers, selectors));

            const stat = new Statistic(this, {
                slug: saveType,
                label: saveName,
                ability: save.ability,
                rank: save.rank,
                notes: extractNotes(rollNotes, selectors),
                modifiers,
                domains: selectors,
                check: {
                    type: "saving-throw",
                },
                dc: {},
            });

            saves[saveType] = stat;
            mergeObject(this.data.data.saves[saveType], stat.getCompatData());
        }

        this.saves = saves as Record<SaveType, Statistic>;
    }

    private prepareSkills(): Record<SkillAbbreviation, CharacterSkillData> {
        const systemData = this.data.data;

        // rebuild the skills object to clear out any deleted or renamed skills from previous iterations
        const { synthetics, wornArmor } = this;

        const skills = Array.from(SKILL_ABBREVIATIONS).reduce((builtSkills, shortForm) => {
            const skill = systemData.skills[shortForm];
            const longForm = SKILL_DICTIONARY[shortForm];

            const domains = [longForm, `${skill.ability}-based`, "skill-check", `${skill.ability}-skill-check`, "all"];
            const modifiers = [
                AbilityModifier.fromScore(skill.ability, systemData.abilities[skill.ability].value),
                ProficiencyModifier.fromLevelAndRank(this.level, skill.rank),
            ];
            for (const modifier of modifiers) {
                modifier.adjustments = this.getModifierAdjustments(domains, modifier.slug);
            }

            // Indicate that the strength requirement of this actor's armor is met
            if (typeof wornArmor?.strength === "number" && this.data.data.abilities.str.value >= wornArmor.strength) {
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
                    adjustments: this.getModifierAdjustments(domains, slug),
                });

                // Set requirements for ignoring the check penalty according to skill
                armorCheckPenalty.predicate.not = ["attack", "armor:ignore-check-penalty"];
                if (["acr", "ath"].includes(shortForm)) {
                    armorCheckPenalty.predicate.not.push(
                        "self:armor:strength-requirement-met",
                        "self:armor:trait:flexible"
                    );
                } else if (shortForm === "ste" && wornArmor.traits.has("noisy")) {
                    armorCheckPenalty.predicate.not.push({
                        and: ["self:armor:strength-requirement-met", "armor:ignore-noisy-penalty"],
                    });
                } else {
                    armorCheckPenalty.predicate.not.push("self:armor:strength-requirement-met");
                }

                modifiers.push(armorCheckPenalty);
            }

            modifiers.push(...extractModifiers(synthetics.statisticsModifiers, domains));

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
            stat.roll = async (args: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                console.warn(
                    `Rolling skill checks via actor.data.data.skills.${shortForm}.roll() is deprecated, use actor.skills.${longForm}.check.roll() instead`
                );
                const label = game.i18n.format("PF2E.SkillCheckWithName", {
                    skillName: game.i18n.localize(CONFIG.PF2E.skills[shortForm]),
                });
                const rollOptions = args.options ?? [];
                ensureProficiencyOption(rollOptions, skill.rank);
                if (args.dc && stat.adjustments) {
                    args.dc.adjustments = stat.adjustments;
                }

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
                    dc: args.dc,
                    rollTwice,
                    substitutions,
                    notes: stat.notes,
                };

                const roll = await CheckPF2e.roll(new CheckModifier(label, stat), context, args.event, args.callback);

                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                }

                return roll;
            };

            builtSkills[shortForm] = stat;
            return builtSkills;
        }, {} as Record<SkillAbbreviation, CharacterSkillData>);

        // Lore skills
        for (const item of this.itemTypes.lore) {
            const skill = item.data;
            // normalize skill name to lower-case and dash-separated words
            const shortForm = sluggify(skill.name) as SkillAbbreviation;
            const rank = skill.data.proficient.value;

            const domains = [shortForm, "int-based", "skill-check", "lore-skill-check", "int-skill-check", "all"];
            const modifiers = [
                AbilityModifier.fromScore("int", systemData.abilities.int.value),
                ProficiencyModifier.fromLevelAndRank(this.level, rank),
                ...extractModifiers(synthetics.statisticsModifiers, domains),
            ];

            const loreSkill = systemData.skills[shortForm];
            const stat = mergeObject(
                new StatisticModifier(shortForm, modifiers, this.getRollOptions(domains)),
                loreSkill,
                { overwrite: false }
            );
            stat.label = skill.name;
            stat.ability = "int";
            stat.itemID = skill._id;
            stat.notes = extractNotes(synthetics.rollNotes, domains);
            stat.rank = rank ?? 0;
            stat.shortform = shortForm;
            stat.expanded = skill;
            stat.value = stat.totalModifier;
            stat.lore = true;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            stat.roll = async (args: RollParameters): Promise<Rolled<CheckRoll> | null> => {
                console.warn(
                    `Rolling skill checks via actor.data.data.skills.${shortForm}.roll() is deprecated, use actor.skills.${shortForm}.check.roll() instead`
                );
                const label = game.i18n.format("PF2E.SkillCheckWithName", { skillName: skill.name });
                const rollOptions = args.options ?? [];
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
                    dc: args.dc,
                    rollTwice,
                    substitutions,
                    notes: stat.notes,
                };

                const roll = await CheckPF2e.roll(new CheckModifier(label, stat), context, args.event, args.callback);

                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                }

                return roll;
            };

            skills[shortForm] = stat;
        }

        return skills;
    }

    override prepareSpeed(movementType: "land"): CreatureSpeeds;
    override prepareSpeed(movementType: Exclude<MovementType, "land">): LabeledSpeed & StatisticModifier;
    override prepareSpeed(movementType: MovementType): CreatureSpeeds | (LabeledSpeed & StatisticModifier);
    override prepareSpeed(movementType: MovementType): CreatureSpeeds | (LabeledSpeed & StatisticModifier) {
        const { wornArmor } = this;
        const basePenalty = wornArmor?.speedPenalty ?? 0;
        const strength = this.data.data.abilities.str.value;
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
                  adjustments: this.getModifierAdjustments(["speed", `${movementType}-speed`], slug),
              })
            : null;
        if (armorPenalty) {
            const speedModifiers = (this.synthetics.statisticsModifiers["speed"] ??= []);
            armorPenalty.predicate.not = ["armor:ignore-speed-penalty"];
            armorPenalty.test(this.getRollOptions(["speed", `${movementType}-speed`]));
            speedModifiers.push(() => armorPenalty);
        }
        return super.prepareSpeed(movementType);
    }

    prepareFeats(): void {
        this.featGroups = {
            ancestryfeature: {
                label: "PF2E.FeaturesAncestryHeader",
                feats: [],
                supported: ["ancestryfeature"],
            },
            classfeature: {
                label: "PF2E.FeaturesClassHeader",
                feats: [],
                supported: ["classfeature"],
            },
            ancestry: {
                label: "PF2E.FeatAncestryHeader",
                feats: [],
                slotted: true,
                featFilter: "ancestry-" + this.ancestry?.slug,
                supported: ["ancestry"],
            },
            class: {
                label: "PF2E.FeatClassHeader",
                feats: [],
                slotted: true,
                featFilter: "classes-" + this.class?.slug,
                supported: ["class"],
            },
            dualclass: {
                label: "PF2E.FeatDualClassHeader",
                feats: [],
                slotted: true,
                supported: ["class"],
            },
            archetype: {
                label: "PF2E.FeatArchetypeHeader",
                feats: [],
                slotted: true,
                supported: ["class"],
            },
            skill: {
                label: "PF2E.FeatSkillHeader",
                feats: [],
                slotted: true,
                supported: ["skill"],
            },
            general: {
                label: "PF2E.FeatGeneralHeader",
                feats: [],
                slotted: true,
                supported: ["general", "skill"],
            },
            campaign: {
                label: "PF2E.FeatCampaignHeader",
                feats: [],
                supported: "all",
            },
            bonus: {
                label: "PF2E.FeatBonusHeader",
                feats: [],
                supported: "all",
            },
        };

        this.pfsBoons = [];
        this.deityBoonsCurses = [];

        if (game.settings.get("pf2e", "dualClassVariant")) {
            this.featGroups.dualclass?.feats.push({ id: "dualclass-1", level: 1, grants: [] });
            for (let level = 2; level <= this.level; level += 2) {
                this.featGroups.dualclass?.feats.push({ id: `dualclass-${level}`, level, grants: [] });
            }
        } else {
            // Use delete so it is in the right place on the sheet
            delete this.featGroups.dualclass;
        }
        if (game.settings.get("pf2e", "freeArchetypeVariant")) {
            for (let level = 2; level <= this.level; level += 2) {
                this.featGroups.archetype?.feats.push({ id: `archetype-${level}`, level, grants: [] });
            }
        } else {
            // Use delete so it is in the right place on the sheet
            delete this.featGroups.archetype;
        }
        if (!game.settings.get("pf2e", "campaignFeats")) {
            // Use delete so it is in the right place on the sheet
            delete this.featGroups.campaign;
        }

        // Add feat slots from class
        if (this.class) {
            const classItem = this.class.data;
            const mapFeatLevels = (featLevels: number[], prefix: string): SlottedFeat[] => {
                if (!featLevels) {
                    return [];
                }
                return featLevels
                    .filter((featSlotLevel: number) => this.level >= featSlotLevel)
                    .map((level) => ({ id: `${prefix}-${level}`, level, grants: [] }));
            };

            mergeObject(this.featGroups, {
                ancestry: { feats: mapFeatLevels(classItem.data.ancestryFeatLevels?.value, "ancestry") },
                class: { feats: mapFeatLevels(classItem.data.classFeatLevels?.value, "class") },
                skill: { feats: mapFeatLevels(classItem.data.skillFeatLevels?.value, "skill") },
                general: { feats: mapFeatLevels(classItem.data.generalFeatLevels?.value, "general") },
            });
        }

        if (game.settings.get("pf2e", "ancestryParagonVariant")) {
            this.featGroups.ancestry?.feats.unshift({
                id: "ancestry-bonus",
                level: 1,
                grants: [],
            });
            for (let level = 3; level <= this.level; level += 4) {
                const index = (level + 1) / 2;
                this.featGroups.ancestry?.feats.splice(index, 0, { id: `ancestry-${level}`, level, grants: [] });
            }
        }

        const background = this.background;
        if (background && Object.keys(background.data.data.items).length > 0) {
            this.featGroups.skill?.feats.unshift({
                id: background.id,
                level: game.i18n.localize("PF2E.FeatBackgroundShort"),
                grants: [],
            });
        }

        // put the feats in their feat slots
        const allFeatSlots = Object.values(this.featGroups).flatMap((slot) => slot?.feats ?? []);
        const feats = this.itemTypes.feat.sort((f1, f2) => f1.data.sort - f2.data.sort);
        for (const feat of feats) {
            const featData = feat.data;
            if (featData.flags.pf2e.grantedBy && !featData.data.location) {
                const granter = this.items.get(featData.flags.pf2e.grantedBy.id);
                if (granter?.isOfType("feat")) continue;
            }

            const location = featData.data.location;
            const featType = featData.data.featType.value;
            let slotIndex = allFeatSlots.findIndex((slotted) => "id" in slotted && slotted.id === location);
            const existing = allFeatSlots[slotIndex]?.feat;
            if (slotIndex !== -1 && existing) {
                console.debug(`Foundry VTT | Multiple feats with same index: ${featData.name}, ${existing.name}`);
                slotIndex = -1;
            }

            const getGrantedItems = (grants: ItemGrantData[]): GrantedFeat[] => {
                return grants.flatMap((grant) => {
                    const item = this.items.get(grant.id);
                    return item?.isOfType("feat") && !item.data.data.location
                        ? { feat: item, grants: getGrantedItems(item.data.flags.pf2e.itemGrants) }
                        : [];
                });
            };

            // If we know the slot, place directly into the slot
            if (slotIndex !== -1) {
                const slot = allFeatSlots[slotIndex];
                slot.feat = featData;
                slot.grants = getGrantedItems(featData.flags.pf2e.itemGrants);
                continue;
            }

            // Handle PFS and Deity boons and curses
            if (featType === "pfsboon") {
                this.pfsBoons.push(featData);
                continue;
            } else if (["deityboon", "curse"].includes(featType)) {
                this.deityBoonsCurses.push(featData);
                continue;
            }

            // Perhaps this belongs to a un-slotted group matched on the location or
            // on the feat type. Failing that, it gets dumped into bonuses.
            const groups: Record<string, FeatSlot | undefined> = this.featGroups;
            const lookedUpGroup = groups[location ?? ""] ?? groups[featType];
            const group = lookedUpGroup && !lookedUpGroup.slotted ? lookedUpGroup : this.featGroups.bonus;
            if (group && !group.slotted) {
                const grants = getGrantedItems(featData.flags.pf2e.itemGrants);
                group.feats.push({ feat: featData, grants });
            }
        }

        this.featGroups.classfeature?.feats.sort(
            (a, b) => (a.feat?.data.level.value || 0) - (b.feat?.data.level.value || 0)
        );
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
                handwraps?.data._source.data ?? {};
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
                  const source: PreCreate<WeaponSource> & { data: { damage?: Partial<WeaponDamage> } } = {
                      _id: "xxPF2ExUNARMEDxx",
                      name: game.i18n.localize("PF2E.WeaponTypeUnarmed"),
                      type: "weapon",
                      img: "systems/pf2e/icons/features/classes/powerful-fist.webp",
                      data: {
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
                    synthetics.strikes.set(slug, weapon.clone({ data: unarmedRunes }, { keepId: true }));
                }

                // Prevent synthetic strikes from being renamed by runes
                const clone = synthetics.strikes.get(slug)!;
                clone.data.name = clone.data._source.name;
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
        const itemData = weapon.data;
        const { synthetics } = this;
        const { rollNotes, statisticsModifiers, strikeAdjustments } = synthetics;
        const modifiers: ModifierPF2e[] = [];
        const systemData = this.data.data;
        const { categories } = options;
        const ammos = options.ammos ?? [];

        // Apply strike adjustments affecting the weapon
        for (const adjustment of strikeAdjustments) {
            adjustment.adjustWeapon?.(weapon);
        }
        const weaponRollOptions = weapon.getRollOptions();
        const weaponTraits = weapon.traits;

        // Determine the default ability and score for this attack.
        const defaultAbility = options.defaultAbility ?? (weapon.isMelee ? "str" : "dex");
        const score = systemData.abilities[defaultAbility].value;
        modifiers.push(AbilityModifier.fromScore(defaultAbility, score));
        if (weapon.isMelee && weaponTraits.has("finesse")) {
            const dexScore = systemData.abilities.dex.value;
            modifiers.push(AbilityModifier.fromScore("dex", dexScore));
        }

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
            "sameAs" in p && p.definition.test(weaponRollOptions) ? `weapon:category:${p.sameAs}` : []
        );
        const weaponProficiencyOptions = new Set(weaponRollOptions.concat(equivalentCategories));

        const syntheticRanks = Object.values(systemData.martial)
            .filter((p): p is MartialProficiency => "definition" in p && p.definition.test(weaponProficiencyOptions))
            .map((p) => p.rank);

        const proficiencyRank = Math.max(categoryRank, groupRank, baseWeaponRank, ...syntheticRanks);
        modifiers.push(ProficiencyModifier.fromLevelAndRank(this.level, proficiencyRank));
        weaponRollOptions.push(`weapon:proficiency:rank:${proficiencyRank}`);

        const unarmedOrWeapon = weapon.category === "unarmed" ? "unarmed" : "weapon";
        const meleeOrRanged = weapon.isMelee ? "melee" : "ranged";
        const slug = weapon.slug ?? sluggify(weapon.name);

        const weaponSpecificSelectors = [
            weapon.baseType ? `${weapon.baseType}-base-attack-roll` : [],
            weapon.group ? `${weapon.group}-group-attack-roll` : [],
            weapon.data.data.traits.otherTags.map((t) => `${t}-tag-attack-roll`),
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
        const baseOptions = [
            ...this.getRollOptions(baseSelectors),
            ...weaponTraits, // always add weapon traits as options
            ...weaponRollOptions,
            meleeOrRanged,
        ];
        ensureProficiencyOption(baseOptions, proficiencyRank);

        // Determine the ability-based synthetic selectors according to the prevailing ability modifier
        const selectors = (() => {
            const options = { resolvables: { weapon } };
            const abilityModifier = [...modifiers, ...extractModifiers(statisticsModifiers, baseSelectors, options)]
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
        const attackRollNotes = extractNotes(rollNotes, selectors);
        const ABP = game.pf2e.variantRules.AutomaticBonusProgression;

        if (weapon.group === "bomb" && !ABP.isEnabled) {
            const attackBonus = Number(itemData.data.bonus?.value) || 0;
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
            const potencyRune = Number(itemData.data.potencyRune?.value) || 0;

            if (potencyRune) {
                const property = getPropertyRunes(itemData, getPropertySlots(itemData)).filter(
                    (r): r is WeaponPropertyRuneType => setHasElement(WEAPON_PROPERTY_RUNE_TYPES, r)
                );
                potency.push({ label: "PF2E.PotencyRuneLabel", bonus: potencyRune, type: "item", property });
            }
            return potency.length > 0
                ? potency.reduce((highest, current) => (highest.bonus > current.bonus ? highest : current))
                : null;
        })();

        if (weaponPotency) {
            modifiers.push(new ModifierPF2e(weaponPotency.label, weaponPotency.bonus, weaponPotency.type));
            weaponTraits.add("magical");
        }

        // Everything from relevant synthetics
        modifiers.push(
            ...extractModifiers(statisticsModifiers, selectors, { injectables: { weapon }, resolvables: { weapon } })
        );

        // Multiple attack penalty
        const multipleAttackPenalty = calculateMAP(weapon);
        {
            const multipleAttackPenalties: MultipleAttackPenaltyPF2e[] = [];
            for (const key of selectors) {
                (synthetics.multipleAttackPenalties[key] ?? [])
                    .filter((map) => PredicatePF2e.test(map.predicate, baseOptions))
                    .forEach((map) => multipleAttackPenalties.push(map));
            }

            // find lowest multiple attack penalty
            multipleAttackPenalties.push({
                label: "PF2E.MultipleAttackPenalty",
                penalty: multipleAttackPenalty.map2,
            });
            const { label, penalty } = multipleAttackPenalties.reduce(
                (lowest, current) => (lowest.penalty > current.penalty ? lowest : current),
                multipleAttackPenalties[0]
            );
            multipleAttackPenalty.label = label;
            multipleAttackPenalty.map2 = penalty;
            multipleAttackPenalty.map3 = penalty * 2;
        }

        const auxiliaryActions: AuxiliaryAction[] = [];
        const isRealItem = this.items.has(weapon.id);

        if (isRealItem && weapon.category !== "unarmed") {
            const traitsArray = weapon.data.data.traits.value;
            const hasFatalAimTrait = traitsArray.some((t) => t.startsWith("fatal-aim"));
            const hasTwoHandTrait = traitsArray.some((t) => t.startsWith("two-hand"));
            const { usage } = weapon.data.data;
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
        const strikeStat = new StatisticModifier(weapon.name, modifiers, rollOptions);
        const altUsages = weapon.getAltUsages().map((w) => this.prepareStrike(w, { categories }));

        const action: CharacterStrike = mergeObject(strikeStat, {
            imageUrl: weapon.img,
            quantity: weapon.quantity,
            slug: weapon.slug,
            ready: weapon.isEquipped,
            glyph: "A",
            item: weapon,
            type: "strike" as const,
            ...flavor,
            options: itemData.data.options?.value ?? [],
            traits: [],
            variants: [],
            selectedAmmoId: itemData.data.selectedAmmoId,
            altUsages,
            auxiliaryActions,
        });

        // Define these as getters so that Foundry's TokenDocument#getBarAttribute method doesn't recurse infinitely
        Object.defineProperty(action, "origin", {
            get: () => this.items.get(weapon.id),
        });

        // Show the ammo list if the weapon requires ammo
        if (weapon.requiresAmmo) {
            const compatible = ammos.filter((ammo) => ammo.isAmmoFor(weapon)).map((ammo) => ammo.toObject(false));
            const incompatible = ammos.filter((ammo) => !ammo.isAmmoFor(weapon)).map((ammo) => ammo.toObject(false));

            const ammo = weapon.ammo;
            const selected = ammo && {
                id: ammo.id,
                compatible: ammo.isAmmoFor(weapon),
            };
            action.ammunition = { compatible, incompatible, selected: selected ?? undefined };
        }

        const strikeTraits: ActionTrait[] = ["attack" as const];
        for (const adjustment of this.synthetics.strikeAdjustments) {
            adjustment.adjustTraits?.(weapon, strikeTraits);
        }
        action.traits = strikeTraits.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits));

        action.breakdown = action.modifiers
            .filter((m) => m.enabled)
            .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
            .join(", ");

        const checkName = game.i18n.format(
            weapon.isMelee ? "PF2E.Action.Strike.MeleeLabel" : "PF2E.Action.Strike.RangedLabel",
            { weapon: weapon.name }
        );

        const mapZeroLabel = ((): string => {
            const strike = game.i18n.localize("PF2E.WeaponStrikeLabel");
            const value = action.totalModifier;
            const sign = value < 0 ? "" : "+";
            return `${strike} ${sign}${value}`;
        })();

        const labels: [string, string, string] = [
            mapZeroLabel,
            game.i18n.format("PF2E.MAPAbbreviationLabel", { penalty: multipleAttackPenalty.map2 }),
            game.i18n.format("PF2E.MAPAbbreviationLabel", { penalty: multipleAttackPenalty.map3 }),
        ];
        const checkModifiers = [
            (otherModifiers: ModifierPF2e[]) => new CheckModifier(checkName, action, otherModifiers),
            (otherModifiers: ModifierPF2e[]) =>
                new CheckModifier(checkName, action, [
                    ...otherModifiers,
                    new ModifierPF2e(multipleAttackPenalty.label, multipleAttackPenalty.map2, MODIFIER_TYPE.UNTYPED),
                ]),
            (otherModifiers: ModifierPF2e[]) =>
                new CheckModifier(checkName, action, [
                    ...otherModifiers,
                    new ModifierPF2e(multipleAttackPenalty.label, multipleAttackPenalty.map3, MODIFIER_TYPE.UNTYPED),
                ]),
        ];

        const getRangeIncrement = (distance: number | null): number | null =>
            weapon.rangeIncrement && typeof distance === "number"
                ? Math.max(Math.ceil(distance / weapon.rangeIncrement), 1)
                : null;

        action.variants = [0, 1, 2]
            .map((index): [string, (otherModifiers: ModifierPF2e[]) => CheckModifier] => [
                labels[index],
                checkModifiers[index],
            ])
            .map(([label, constructModifier]) => ({
                label,
                roll: async (args: StrikeRollParams): Promise<Rolled<CheckRoll> | null> => {
                    if (weapon.requiresAmmo && !weapon.ammo) {
                        ui.notifications.warn(
                            game.i18n.format("PF2E.Strike.Ranged.NoAmmo", { weapon: weapon.name, actor: this.name })
                        );
                        return null;
                    }

                    const context = this.getAttackRollContext({
                        domains: [],
                        item: weapon,
                        viewOnly: args.getFormula ?? false,
                    });

                    // Set range-increment roll option and penalty
                    const rangeIncrement = getRangeIncrement(context.target?.distance ?? null);
                    const incrementOption = rangeIncrement ? `target:range-increment:${rangeIncrement}` : [];
                    const otherModifiers = [
                        this.getRangePenalty(rangeIncrement, selectors, baseOptions) ?? [],
                        context.self.modifiers,
                    ].flat();

                    // Collect roll options from all sources
                    args.options ??= [];
                    const options = [
                        args.options,
                        context.options,
                        action.options,
                        baseOptions,
                        incrementOption,
                    ].flat();

                    // Get just-in-time roll options from rule elements
                    for (const rule of this.rules.filter((r) => !r.ignored)) {
                        rule.beforeRoll?.(selectors, options);
                    }
                    const finalRollOptions = Array.from(new Set(options));

                    const dc = args.dc ?? context.dc;
                    if (dc && action.adjustments) {
                        dc.adjustments = action.adjustments;
                    }

                    const item = context.self.item;
                    const rollTwice = extractRollTwice(synthetics.rollTwice, selectors, finalRollOptions);

                    const checkContext: CheckRollContext = {
                        actor: context.self.actor,
                        target: context.target,
                        item,
                        type: "attack-roll",
                        altUsage: args.altUsage ?? null,
                        options: finalRollOptions,
                        notes: attackRollNotes,
                        dc,
                        traits: context.traits,
                        rollTwice,
                    };

                    if (!this.consumeAmmo(item, args)) return null;

                    const roll = await CheckPF2e.roll(
                        constructModifier(otherModifiers),
                        checkContext,
                        args.event,
                        args.callback
                    );

                    for (const rule of this.rules.filter((r) => !r.ignored)) {
                        await rule.afterRoll?.({ roll, selectors, domains: selectors, rollOptions: finalRollOptions });
                    }

                    return roll;
                },
            }));
        action.attack = action.roll = action.variants[0].roll;

        for (const method of ["damage", "critical"] as const) {
            action[method] = async (args: StrikeRollParams): Promise<string | void> => {
                const context = this.getDamageRollContext({
                    item: weapon,
                    viewOnly: args.getFormula ?? false,
                });

                // Set range-increment roll option
                const rangeIncrement = getRangeIncrement(context.target?.distance ?? null);
                const incrementOption =
                    typeof rangeIncrement === "number" ? `target:range-increment:${rangeIncrement}` : [];
                args.options ??= [];
                const options = Array.from(
                    new Set([args.options, context.options, action.options, baseOptions, incrementOption].flat())
                );

                const damage = WeaponDamagePF2e.calculate(
                    context.self.item.data,
                    context.self.actor,
                    context.traits,
                    statisticsModifiers,
                    this.cloneSyntheticsRecord(synthetics.damageDice),
                    proficiencyRank,
                    options,
                    this.cloneSyntheticsRecord(rollNotes),
                    weaponPotency,
                    synthetics.striking,
                    synthetics.strikeAdjustments
                );
                const outcome = method === "damage" ? "success" : "criticalSuccess";
                if (args.getFormula) {
                    return damage.formula[outcome].formula;
                } else {
                    const { self, target, options } = context;

                    const damageContext: DamageRollContext = { type: "damage-roll", self, target, outcome, options };

                    await DamageRollPF2e.roll(damage, damageContext, args.callback);
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
    protected override getStrikeRollContext<I extends AttackItem>(
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
            context.self.modifiers.push(...StrikeWeaponTraits.createAttackModifiers(context.self.item));
        }

        return context;
    }

    consumeAmmo(weapon: WeaponPF2e, args: RollParameters): boolean {
        const ammo = weapon.ammo;
        if (!ammo) {
            return true;
        } else if (ammo.quantity < 1) {
            ui.notifications.warn(game.i18n.localize("PF2E.ErrorMessage.NotEnoughAmmo"));
            return false;
        } else {
            const existingCallback = args.callback;
            args.callback = async (roll: Rolled<Roll>) => {
                existingCallback?.(roll);
                await ammo.consume();
            };
            return true;
        }
    }

    /** Prepare stored and synthetic martial proficiencies */
    prepareMartialProficiencies(): void {
        const systemData = this.data.data;

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

            const proficiencyBonus = ProficiencyModifier.fromLevelAndRank(this.level, proficiency.rank || 0);
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

        return !!(await item.update({ "data.equipped.invested": !item.isInvested }));
    }

    /** Add a proficiency in a weapon group or base weapon */
    async addCombatProficiency(key: BaseWeaponProficiencyKey | WeaponGroupProficiencyKey): Promise<void> {
        const currentProficiencies = this.data.data.martial;
        if (key in currentProficiencies) return;
        const newProficiency: CharacterProficiency = { rank: 0, value: 0, breakdown: "", custom: true };
        await this.update({ [`data.martial.${key}`]: newProficiency });
    }

    async removeCombatProficiency(key: BaseWeaponProficiencyKey | WeaponGroupProficiencyKey): Promise<void> {
        await this.update({ [`data.martial.-=${key}`]: null });
    }

    /**
     * Roll a Recovery Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     */
    async rollRecovery(event: JQuery.TriggeredEvent): Promise<Rolled<CheckRoll> | null> {
        const dying = this.data.data.attributes.dying.value;
        if (!dying) return null;

        const translations = LocalizePF2e.translations.PF2E;
        const { Recovery } = translations;

        // const wounded = this.data.data.attributes.wounded.value; // not needed currently as the result is currently not automated
        const recoveryDC = this.data.data.attributes.dying.recoveryDC;

        const dc: CheckDC = {
            label: game.i18n.format(translations.Recovery.rollingDescription, {
                dying,
                dc: "{dc}", // Replace variable with variable, which will be replaced with the actual value in CheckModifiersDialog.Roll()
            }),
            value: recoveryDC + dying,
            visibility: "all",
        };

        const notes = [
            new RollNotePF2e("all", game.i18n.localize(Recovery.critSuccess), undefined, ["criticalSuccess"]),
            new RollNotePF2e("all", game.i18n.localize(Recovery.success), undefined, ["success"]),
            new RollNotePF2e("all", game.i18n.localize(Recovery.failure), undefined, ["failure"]),
            new RollNotePF2e("all", game.i18n.localize(Recovery.critFailure), undefined, ["criticalFailure"]),
        ];

        const modifier = new StatisticModifier(game.i18n.localize(translations.Check.Specific.Recovery), []);
        const token = this.getActiveTokens(false, true).shift();

        return CheckPF2e.roll(modifier, { actor: this, token, dc, notes }, event);

        // No automated update yet, not sure if Community wants that.
        // return this.update({[`data.attributes.dying.value`]: dying}, [`data.attributes.wounded.value`]: wounded});
    }

    /** Remove any features linked to a to-be-deleted ABC item */
    override async deleteEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        ids: string[],
        context: DocumentModificationContext = {}
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]> {
        if (embeddedName === "Item") {
            const abcItems = [this.ancestry, this.background, this.class].filter(
                (item): item is Embedded<AncestryPF2e | BackgroundPF2e | ClassPF2e> => !!item && ids.includes(item.id)
            );
            const featureIds = abcItems.flatMap((item) => item.getLinkedFeatures().map((feature) => feature.id));
            ids.push(...featureIds);
        }
        return super.deleteEmbeddedDocuments(embeddedName, [...new Set(ids)], context) as Promise<
            ActiveEffectPF2e[] | ItemPF2e[]
        >;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<CharacterSource>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        const systemData = this.data.data;

        // Clamp level, allowing for level-0 variant rule and enough room for homebrew "mythical" campaigns
        const level = changed.data?.details?.level;
        if (level?.value !== undefined) {
            level.value = Math.clamped(Number(level.value) || 0, 0, 30);
        }

        // Clamp Stamina and Resolve
        if (game.settings.get("pf2e", "staminaVariant")) {
            // Do not allow stamina to go over max
            if (changed.data?.attributes?.sp) {
                changed.data.attributes.sp.value = Math.clamped(
                    changed.data?.attributes?.sp?.value || 0,
                    0,
                    systemData.attributes.sp.max
                );
            }

            // Do not allow resolve to go over max
            if (changed.data?.attributes?.resolve) {
                changed.data.attributes.resolve.value = Math.clamped(
                    changed.data?.attributes?.resolve?.value || 0,
                    0,
                    systemData.attributes.resolve.max
                );
            }
        }

        // Add or remove class features as necessary
        const newLevel = changed.data?.details?.level?.value ?? this.level;
        if (newLevel !== this.level) {
            await AncestryBackgroundClassManager.ensureClassFeaturesForLevel(this, newLevel);
        }

        // Constrain PFS player and character numbers
        for (const property of ["playerNumber", "characterNumber"] as const) {
            if (typeof changed.data?.pfs?.[property] === "number") {
                const [min, max] = property === "playerNumber" ? [1, 9_999_999] : [2001, 9999];
                changed.data.pfs[property] = Math.clamped(changed.data.pfs[property] || 0, min, max);
            } else if (changed.data?.pfs && changed.data.pfs[property] !== null) {
                changed.data.pfs[property] = this.data.data.pfs[property] ?? null;
            }
        }

        await super._preUpdate(changed, options, user);
    }

    /** Perform heritage and deity deletions prior to the creation of new ones */
    async preCreateDelete(toCreate: PreCreate<ItemSourcePF2e>[]): Promise<void> {
        const { itemTypes } = this;
        const singularTypes = ["heritage", "deity"] as const;
        const deletionTypes = singularTypes.filter((t) => toCreate.some((i) => i.type === t));
        const preCreateDeletions = deletionTypes.flatMap((t): ItemPF2e[] => itemTypes[t]).map((i) => i.id);
        if (preCreateDeletions.length > 0) {
            await this.deleteEmbeddedDocuments("Item", preCreateDeletions, { render: false });
        }
    }
}

interface CharacterPF2e {
    readonly data: CharacterData;

    deleteEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        dataId: string[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[]>;
    deleteEmbeddedDocuments(
        embeddedName: "Item",
        dataId: string[],
        context?: DocumentModificationContext
    ): Promise<ItemPF2e[]>;
    deleteEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        dataId: string[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;
}

export { CharacterPF2e };
