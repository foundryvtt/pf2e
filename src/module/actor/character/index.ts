import { ItemPF2e } from "@item/base";
import { getPropertyRunes, getPropertySlots, getResiliencyBonus } from "@item/runes";
import {
    AbilityModifier,
    ensureProficiencyOption,
    CheckModifier,
    ModifierPF2e,
    MODIFIER_TYPE,
    StatisticModifier,
    ProficiencyModifier,
} from "@module/modifiers";
import { WeaponDamagePF2e } from "@system/damage/weapon";
import { CheckPF2e, DamageRollPF2e, RollParameters, StrikeRollParams } from "@system/rolls";
import {
    ABILITY_ABBREVIATIONS,
    SAVE_TYPES,
    SKILL_ABBREVIATIONS,
    SKILL_DICTIONARY,
    SKILL_EXPANDED,
} from "../data/values";
import {
    BaseWeaponProficiencyKey,
    CharacterArmorClass,
    CharacterAttributes,
    CharacterData,
    CharacterProficiency,
    CharacterSaves,
    CharacterStrike,
    CharacterSystemData,
    MartialProficiencies,
    WeaponGroupProficiencyKey,
    MagicTraditionProficiencies,
    MartialProficiency,
    CharacterSheetTabVisibility,
    LinkedProficiency,
    AuxiliaryAction,
} from "./data";
import { MultipleAttackPenaltyPF2e } from "@module/rules/rule-element";
import { ErrorPF2e, getActionGlyph, sluggify, sortedStringify } from "@util";
import {
    AncestryPF2e,
    BackgroundPF2e,
    ClassPF2e,
    ConsumablePF2e,
    HeritagePF2e,
    PhysicalItemPF2e,
    WeaponPF2e,
} from "@item";
import { CreaturePF2e } from "../";
import { WeaponCategory, WeaponDamage, WeaponSource, WeaponTrait, WEAPON_CATEGORIES } from "@item/weapon/data";
import { PROFICIENCY_RANKS, ZeroToFour, ZeroToThree } from "@module/data";
import { AbilityString, StrikeTrait } from "@actor/data/base";
import { CreatureSpeeds, LabeledSpeed, MovementType, SkillAbbreviation } from "@actor/creature/data";
import { ARMOR_CATEGORIES } from "@item/armor/data";
import { ActiveEffectPF2e } from "@module/active-effect";
import { MAGIC_TRADITIONS } from "@item/spell/data";
import { CharacterSource, SaveType } from "@actor/data";
import { PredicatePF2e } from "@system/predication";
import { AncestryBackgroundClassManager } from "@item/abc/manager";
import { fromUUIDs } from "@util/from-uuids";
import { UserPF2e } from "@module/user";
import { CraftingEntry, CraftingFormula } from "./crafting";
import { ActorSizePF2e } from "@actor/data/size";
import { PhysicalItemSource } from "@item/data";
import { extractModifiers, extractNotes } from "@module/rules/util";
import { HitPointsSummary } from "@actor/base";
import { Statistic } from "@system/statistic";
import { CHARACTER_SHEET_TABS } from "./data/values";
import { ChatMessagePF2e } from "@module/chat-message";
import { ItemCarryType } from "@item/physical/data";
import { CreateAuxiliaryParams } from "./types";
import { StrikeWeaponTraits } from "./strike-weapon-traits";
import { AttackItem, AttackRollContext, StrikeRollContext, StrikeRollContextParams } from "@actor/creature/types";
import { DamageRollContext } from "@system/damage/damage";
import { RollNotePF2e } from "@module/notes";
import { CheckDC } from "@system/degree-of-success";
import { LocalizePF2e } from "@system/localize";

export class CharacterPF2e extends CreaturePF2e {
    static override get schema(): typeof CharacterData {
        return CharacterData;
    }

    get ancestry(): Embedded<AncestryPF2e> | null {
        return this.itemTypes.ancestry[0] ?? null;
    }

    get background(): Embedded<BackgroundPF2e> | null {
        return this.itemTypes.background[0] ?? null;
    }

    get class(): Embedded<ClassPF2e> | null {
        return this.itemTypes.class[0] ?? null;
    }

    get heritage(): Embedded<HeritagePF2e> | null {
        return this.itemTypes.heritage[0] ?? null;
    }

    get keyAbility(): AbilityString {
        return this.data.data.details.keyability.value || "str";
    }

    /** This PC's ability scores */
    get abilities() {
        return deepClone(this.data.data.abilities);
    }

    override get hitPoints(): CharacterHitPointsSummary {
        return {
            ...super.hitPoints,
            recoveryMultiplier: this.data.data.attributes.hp.recoveryMultiplier,
        };
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
        return Object.values(this.data.data.crafting.entries).map(
            (entry) => new CraftingEntry(this, craftingFormulas, entry)
        );
    }

    async getCraftingEntry(selector: string): Promise<CraftingEntry | undefined> {
        const craftingFormulas = await this.getCraftingFormulas();
        const craftingEntryData = this.data.data.crafting.entries[selector];
        if (!craftingEntryData) return;
        return new CraftingEntry(this, craftingFormulas, craftingEntryData);
    }

    async performDailyCrafting() {
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
        for (const item of this.physicalItems) {
            if (item.data.data.temporary?.value) await item.delete();
        }

        for (const entry of entries) {
            for (const prepData of entry.preparedFormulas) {
                const item: PhysicalItemSource = prepData.item.toObject();
                item.data.quantity.value = prepData.quantity || 1;
                item.data.temporary = { value: true };
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

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();
        const systemData: DeepPartial<CharacterSystemData> = this.data.data;

        // Flags
        const { flags } = this.data;
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

        // Attributes
        const attributes: DeepPartial<CharacterAttributes> = this.data.data.attributes;
        attributes.ac = {};
        attributes.classDC = { rank: 0 };
        attributes.dexCap = [{ value: Infinity, source: "" }];

        const perception = (attributes.perception ??= { ability: "wis", rank: 0 });
        perception.ability = "wis";
        perception.rank ??= 0;

        attributes.reach = { value: 5, manipulate: 5 };
        attributes.doomed = { value: 0, max: 3 };
        attributes.dying = { value: 0, max: 4, recoveryMod: 0 };
        attributes.wounded = { value: 0, max: 3 };

        // Hit points
        const hitPoints = this.data.data.attributes.hp;
        hitPoints.recoveryMultiplier = 1;
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
            traditions: MAGIC_TRADITIONS.reduce(
                (accumulated: DeepPartial<MagicTraditionProficiencies>, tradition) => ({
                    ...accumulated,
                    [tradition]: { rank: 0 },
                }),
                {}
            ),
        };

        // Resources
        const { resources } = this.data.data;
        resources.investiture = { value: 0, max: 10 };
        resources.focus ??= { value: 0, max: 0 };
        resources.focus.max = 0;
        resources.crafting ??= {
            infusedReagents: {
                value: 0,
                max: 0,
            },
        };
        resources.heroPoints.max = 3;

        // Size
        this.data.data.traits.size = new ActorSizePF2e({ value: "med" });

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
    }

    /** After AE-likes have been applied, compute ability modifiers and set numeric roll options */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();

        for (const ability of Object.values(this.data.data.abilities)) {
            ability.mod = Math.floor((ability.value - 10) / 2);
        }
        this.setNumericRollOptions();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const systemData = this.data.data;
        const { synthetics } = this;

        if (!this.data.flags.pf2e.disableABP) {
            game.pf2e.variantRules.AutomaticBonusProgression.concatModifiers(this.level, synthetics);
        }

        // Extract as separate variables for easier use in this method.
        const { statisticsModifiers, strikes, rollNotes } = synthetics;

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
        if (systemData.pfs?.levelBump) {
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
            if (systemData.pfs?.levelBump) {
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
            stat.notes = domains.flatMap((d) => duplicate(rollNotes[d] ?? []));
            stat.value = stat.totalModifier;
            stat.roll = async (args: RollParameters): Promise<void> => {
                const label = game.i18n.localize("PF2E.PerceptionCheck");
                const options = args.options ?? [];
                ensureProficiencyOption(options, proficiencyRank);
                if (args.dc && stat.adjustments) {
                    args.dc.adjustments = stat.adjustments;
                }

                // Get just-in-time roll options from rule elements
                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    rule.beforeRoll?.(domains, options);
                }

                await CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: "perception-check", options, dc: args.dc, notes: stat.notes },
                    args.event,
                    args.callback
                );
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
            stat.notes = domains.flatMap((d) => duplicate(rollNotes[d] ?? []));
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
                        adjustments: this.getModifierAdjustments(["ac"], slug),
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
            const domains = ["ac", `${acAbility}-based`, "all"];
            modifiers.push(...extractModifiers(statisticsModifiers, domains));

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

        // Skill modifiers

        // rebuild the skills object to clear out any deleted or renamed skills from previous iterations
        const skills: Partial<CharacterSystemData["skills"]> = {};

        for (const shortForm of SKILL_ABBREVIATIONS) {
            const skill = systemData.skills[shortForm];
            const modifiers = [
                AbilityModifier.fromScore(skill.ability, systemData.abilities[skill.ability].value),
                ProficiencyModifier.fromLevelAndRank(this.level, skill.rank),
            ];
            // workaround for the shortform skill names
            const longForm = SKILL_DICTIONARY[shortForm];

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
                    adjustments: this.getModifierAdjustments(["ac"], slug),
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

            const domains = [longForm, `${skill.ability}-based`, "skill-check", `${skill.ability}-skill-check`, "all"];
            modifiers.push(...extractModifiers(statisticsModifiers, domains));

            const rollOptions = this.getRollOptions(domains);
            const stat = mergeObject(new StatisticModifier(longForm, modifiers, rollOptions), skill, {
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
            stat.notes = domains.flatMap((key) => duplicate(rollNotes[key] ?? []));
            stat.rank = skill.rank;
            stat.roll = async (args: RollParameters): Promise<void> => {
                const label = game.i18n.format("PF2E.SkillCheckWithName", {
                    skillName: game.i18n.localize(CONFIG.PF2E.skills[shortForm]),
                });
                const options = args.options ?? [];
                ensureProficiencyOption(options, skill.rank);
                if (args.dc && stat.adjustments) {
                    args.dc.adjustments = stat.adjustments;
                }

                // Get just-in-time roll options from rule elements
                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    rule.beforeRoll?.(domains, options);
                }

                await CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: "skill-check", options, dc: args.dc, notes: stat.notes },
                    args.event,
                    args.callback
                );
            };

            skills[shortForm] = stat;
        }

        // Lore skills
        for (const item of itemTypes.lore) {
            const skill = item.data;
            // normalize skill name to lower-case and dash-separated words
            const shortForm = sluggify(skill.name) as SkillAbbreviation;
            const rank = skill.data.proficient.value;

            const domains = [shortForm, "int-based", "skill-check", "lore-skill-check", "int-skill-check", "all"];
            const modifiers = [
                AbilityModifier.fromScore("int", systemData.abilities.int.value),
                ProficiencyModifier.fromLevelAndRank(this.level, rank),
                ...extractModifiers(statisticsModifiers, domains),
            ];

            const loreSkill = systemData.skills[shortForm];
            const rollOptions = this.getRollOptions(domains);
            const stat = mergeObject(new StatisticModifier(skill.name, modifiers, rollOptions), loreSkill, {
                overwrite: false,
            });
            stat.itemID = skill._id;
            stat.notes = domains.flatMap((key) => duplicate(rollNotes[key] ?? []));
            stat.rank = rank ?? 0;
            stat.shortform = shortForm;
            stat.expanded = skill;
            stat.value = stat.totalModifier;
            stat.lore = true;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            stat.roll = async (args: RollParameters): Promise<void> => {
                const label = game.i18n.format("PF2E.SkillCheckWithName", { skillName: skill.name });
                const options = args.options ?? [];
                ensureProficiencyOption(options, rank);

                // Get just-in-time roll options from rule elements
                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    rule.beforeRoll?.(domains, options);
                }

                await CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: "skill-check", options, dc: args.dc, notes: stat.notes },
                    args.event,
                    args.callback
                );
            };

            skills[shortForm] = stat;
        }

        systemData.skills = skills as Required<typeof skills>;

        // Speeds
        systemData.attributes.speed = this.prepareSpeed("land");
        const { otherSpeeds } = systemData.attributes.speed;
        for (let idx = 0; idx < otherSpeeds.length; idx++) {
            otherSpeeds[idx] = this.prepareSpeed(otherSpeeds[idx].type);
        }

        // Automatic Actions
        systemData.actions = [];

        // Add a basic unarmed strike unless a fixed-proficiency rule element is in effect
        const unarmed = ((): Embedded<WeaponPF2e> => {
            const source: PreCreate<WeaponSource> & { data: { damage: Partial<WeaponDamage> } } = {
                _id: "xxPF2ExUNARMEDxx",
                name: game.i18n.localize("PF2E.WeaponTypeUnarmed"),
                type: "weapon",
                img: "systems/pf2e/icons/features/classes/powerful-fist.webp",
                data: {
                    slug: "basic-unarmed",
                    baseItem: null,
                    category: "unarmed",
                    bonus: { value: 0 },
                    damage: { dice: 1, die: "d4", damageType: "bludgeoning" },
                    group: "brawling",
                    range: null,
                    strikingRune: { value: null },
                    traits: { value: ["agile", "finesse", "nonlethal", "unarmed"] },
                    equipped: {
                        carryType: "held",
                        handsHeld: 1,
                    },
                    usage: {
                        value: "held-in-one-hand",
                    },
                },
            };

            return new WeaponPF2e(source, { parent: this, pf2e: { ready: true } }) as Embedded<WeaponPF2e>;
        })();
        synthetics.strikes.unshift(unarmed);

        const ammos = itemTypes.consumable.filter(
            (item) => item.data.data.consumableType.value === "ammo" && !item.isStowed
        );
        const homebrewCategoryTags = game.settings.get("pf2e", "homebrew.weaponCategories");
        const offensiveCategories = WEAPON_CATEGORIES.concat(homebrewCategoryTags.map((tag) => tag.id));
        const weapons = [itemTypes.weapon, strikes].flat();
        systemData.actions = weapons.map((weapon) =>
            this.prepareStrike(weapon, { categories: offensiveCategories, ammos })
        );

        systemData.actions.sort((l, r) => {
            if (l.ready !== r.ready) return (l.ready ? 0 : 1) - (r.ready ? 0 : 1);
            return (l.weapon?.data.sort ?? 0) - (r.weapon?.data.sort ?? 0);
        });

        // Spellcasting Entries
        for (const entry of itemTypes.spellcastingEntry) {
            const tradition = entry.tradition;
            const rank = (entry.data.data.proficiency.value = entry.rank);

            const baseSelectors = [`${entry.ability}-based`, "all", "spell-attack-dc"];
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
                ability: entry.ability,
                rank,
                modifiers: extractModifiers(statisticsModifiers, baseSelectors),
                notes: extractNotes(rollNotes, [...baseSelectors, ...attackSelectors]),
                domains: baseSelectors,
                check: {
                    type: "spell-attack-roll",
                    label: game.i18n.format(`PF2E.SpellAttack.${tradition}`),
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

        // Initiative
        this.prepareInitiative(statisticsModifiers, rollNotes);

        // Resources
        const { resources } = this.data.data;
        resources.focus.max = Math.clamped(resources.focus.max, 0, 3);
        // Ensure the character has a focus pool of at least one point if they have a focus spellcasting entry
        if (!resources.focus.max && this.spellcasting.regular.some((entry) => entry.isFocusPool)) {
            resources.focus.max = 1;
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

    /** Set roll operations for ability scores and proficiency ranks */
    protected override setNumericRollOptions(): void {
        super.setNumericRollOptions();

        const rollOptionsAll = this.rollOptions.all;

        const perceptionRank = this.data.data.attributes.perception.rank;
        rollOptionsAll[`self:perception:rank:${perceptionRank}`] = true;

        for (const key of ABILITY_ABBREVIATIONS) {
            const score = this.abilities[key].value;
            rollOptionsAll[`self:ability:${key}:score:${score}`] = true;
        }

        for (const key of SKILL_ABBREVIATIONS) {
            const rank = this.data.data.skills[key].rank;
            rollOptionsAll[`self:skill:${key}:rank:${rank}`] = true;
        }

        for (const key of SAVE_TYPES) {
            const rank = this.data.data.saves[key].rank;
            rollOptionsAll[`self:save:${key}:rank:${rank}`] = true;
        }
    }

    prepareSaves(): void {
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
                const bulwarkModifier = new ModifierPF2e(CONFIG.PF2E.armorTraits.bulwark, 3, MODIFIER_TYPE.UNTYPED);
                bulwarkModifier.predicate = new PredicatePF2e({
                    all: ["damaging-effect"],
                    not: ["self:armor:bulwark-all"],
                });
                modifiers.push(bulwarkModifier);
            }

            // Add custom modifiers and roll notes relevant to this save.
            const selectors = [saveType, `${save.ability}-based`, "saving-throw", "all"];
            modifiers.push(...extractModifiers(statisticsModifiers, selectors));

            const stat = new Statistic(this, {
                slug: saveType,
                ability: save.ability,
                rank: save.rank,
                notes: extractNotes(rollNotes, selectors),
                modifiers,
                domains: selectors,
                check: {
                    type: "saving-throw",
                    label: game.i18n.format("PF2E.SavingThrowWithName", { saveName }),
                },
                dc: {},
            });

            if (affectedByBulwark) {
                stat.abilityModifier?.predicate.not.push(
                    { and: ["self:armor:trait:bulwark", "damaging-effect"] },
                    "self:armor:bulwark-all"
                );
            }

            saves[saveType] = stat;
            mergeObject(this.data.data.saves[saveType], stat.getCompatData());
        }

        this.saves = saves as Record<SaveType, Statistic>;
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
            armorPenalty.test(this.getRollOptions(["all", "speed", `${movementType}-speed`]));
            speedModifiers.push(() => armorPenalty);
        }
        return super.prepareSpeed(movementType);
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

    /** Prepare a strike action from a weapon */
    prepareStrike(
        weapon: Embedded<WeaponPF2e>,
        options: {
            categories: WeaponCategory[];
            ammos?: Embedded<ConsumablePF2e>[];
        }
    ): CharacterStrike {
        const itemData = weapon.data;
        const { synthetics } = this;
        const { rollNotes, statisticsModifiers, strikeAdjustments } = synthetics;
        const modifiers: ModifierPF2e[] = [];
        const systemData = this.data.data;
        const { categories } = options;
        const ammos = options.ammos ?? [];

        // Apply strike adjustments
        const weaponRollOptions = weapon.getRollOptions();
        for (const adjustment of strikeAdjustments) {
            adjustment.adjustStrike(weapon);
        }

        const weaponTraits = weapon.traits;

        // Determine the default ability and score for this attack.
        const defaultAbility: "str" | "dex" = weapon.isMelee ? "str" : "dex";
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

        // If a weapon matches against a linked proficiency, add the `sameAs` category to the weapon's item roll options
        const equivalentCategories = Object.values(systemData.martial).flatMap((p) =>
            "sameAs" in p && p.definition.test(weaponRollOptions) ? `weapon:category:${p.sameAs}` : []
        );
        weaponRollOptions.push(...equivalentCategories);

        const syntheticRanks = Object.values(systemData.martial)
            .filter((p): p is MartialProficiency => "definition" in p && p.definition.test(weaponRollOptions))
            .map((p) => p.rank);

        const proficiencyRank = Math.max(categoryRank, groupRank, baseWeaponRank, ...syntheticRanks);
        modifiers.push(ProficiencyModifier.fromLevelAndRank(this.level, proficiencyRank));
        weaponRollOptions.push(`weapon:proficiency:rank:${proficiencyRank}`);

        const unarmedOrWeapon = weapon.category === "unarmed" ? "unarmed" : "weapon";
        const meleeOrRanged = weapon.isMelee ? "melee" : "ranged";
        const baseSelectors = [
            "attack",
            "mundane-attack",
            `${weapon.id}-attack`,
            `${sluggify(weapon.name)}-attack`,
            "strike-attack-roll",
            `${unarmedOrWeapon}-attack-roll`,
            `${meleeOrRanged}-attack-roll`,
            "attack-roll",
            "all",
        ];
        const defaultOptions = this.getRollOptions(baseSelectors)
            .concat(...weaponTraits) // always add weapon traits as options
            .concat(weaponRollOptions)
            .concat(meleeOrRanged);
        ensureProficiencyOption(defaultOptions, proficiencyRank);

        // Determine the ability-based synthetic selectors according to the prevailing ability modifier
        const selectors = (() => {
            const options = { resolvables: { weapon } };
            const abilityModifier = [...modifiers, ...extractModifiers(statisticsModifiers, baseSelectors, options)]
                .filter((m): m is ModifierPF2e & { ability: AbilityString } => m.type === "ability")
                .flatMap((modifier) => (modifier.predicate.test(defaultOptions) ? modifier : []))
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
        const notes = selectors.flatMap((key) => duplicate(rollNotes[key] ?? []));
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
                .filter((wp) => PredicatePF2e.test(wp.predicate, defaultOptions));
            ABP.applyPropertyRunes(potency, weapon);
            const potencyRune = Number(itemData.data.potencyRune?.value) || 0;

            if (potencyRune) {
                const property = getPropertyRunes(itemData, getPropertySlots(itemData));
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
        const multipleAttackPenalty = ItemPF2e.calculateMap(itemData);
        {
            const multipleAttackPenalties: MultipleAttackPenaltyPF2e[] = [];
            for (const key of selectors) {
                (synthetics.multipleAttackPenalties[key] ?? [])
                    .filter((map) => PredicatePF2e.test(map.predicate, defaultOptions))
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
            const canWield2H = weapon.data.usage.hands === 2 || hasFatalAimTrait || hasTwoHandTrait;

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
        const rollOptions = this.getRollOptions(defaultOptions);
        const strikeStat = new StatisticModifier(weapon.name, modifiers, rollOptions);
        const meleeUsage = weapon.toMeleeUsage();

        const action: CharacterStrike = mergeObject(strikeStat, {
            imageUrl: weapon.img,
            quantity: weapon.quantity,
            slug: weapon.slug,
            ready: weapon.isEquipped,
            glyph: "A",
            type: "strike" as const,
            description: flavor.description,
            criticalSuccess: flavor.criticalSuccess,
            success: flavor.success,
            options: itemData.data.options?.value ?? [],
            traits: [],
            variants: [],
            selectedAmmoId: itemData.data.selectedAmmoId,
            meleeUsage: meleeUsage ? this.prepareStrike(meleeUsage, { categories }) : null,
            auxiliaryActions,
        });

        // Define these as getters so that Foundry's TokenDocument#getBarAttribute method doesn't recurse infinitely
        Object.defineProperty(action, "origin", {
            get: () => this.items.get(weapon.id),
        });
        Object.defineProperty(action, "item", {
            get: () => weapon,
        });

        // Sets the ammo list if its an ammo using weapon group
        const usesAmmo = { bases: ["blowgun"], groups: ["firearm", "bow", "sling"] };
        if (usesAmmo.groups.includes(weapon.group ?? "") || usesAmmo.bases.includes(weapon.baseType ?? "")) {
            const compatible = ammos.filter((ammo) => ammo.isAmmoFor(weapon)).map((ammo) => ammo.toObject(false));
            const incompatible = ammos.filter((ammo) => !ammo.isAmmoFor(weapon)).map((ammo) => ammo.toObject(false));

            const ammo = weapon.ammo;
            const selected = ammo && {
                id: ammo.id,
                compatible: ammo.isAmmoFor(weapon),
            };
            action.ammunition = { compatible, incompatible, selected: selected ?? undefined };
        }

        const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
        const attackTrait: StrikeTrait = {
            name: "attack",
            label: CONFIG.PF2E.featTraits.attack,
            description: CONFIG.PF2E.traitsDescriptions.attack,
        };

        const toStrikeTrait = (trait: WeaponTrait) => {
            // Look up trait labels from `npcAttackTraits` instead of `weaponTraits` in case a battle form attack is
            // in use, which can include what are normally NPC-only traits
            const label = CONFIG.PF2E.npcAttackTraits[trait] ?? trait;
            const traitObject: StrikeTrait = {
                name: trait,
                label,
                description: traitDescriptions[trait] ?? "",
            };

            // look for toggleable traits
            if (trait.startsWith("versatile-")) {
                traitObject.rollName = "damage-roll";
                traitObject.rollOption = trait;
            }

            return traitObject;
        };
        action.traits = [attackTrait].concat([...weaponTraits].map(toStrikeTrait));

        action.breakdown = action.modifiers
            .filter((m) => m.enabled)
            .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
            .join(", ");

        const strikeLabel = game.i18n.localize("PF2E.WeaponStrikeLabel");
        const flavorText = weaponTraits.has("combination")
            ? weapon.isMelee
                ? game.i18n.format("PF2E.Item.Weapon.MeleeUsage.StrikeLabel.Melee", { weapon: weapon.name })
                : game.i18n.format("PF2E.Item.Weapon.MeleeUsage.StrikeLabel.Ranged", { weapon: weapon.name })
            : `${strikeLabel}: ${action.name}`;

        const labels: [string, string, string] = [
            `${game.i18n.localize("PF2E.RuleElement.Strike")} ${action.totalModifier < 0 ? "" : "+"}${
                action.totalModifier
            }`,
            game.i18n.format("PF2E.MAPAbbreviationLabel", { penalty: multipleAttackPenalty.map2 }),
            game.i18n.format("PF2E.MAPAbbreviationLabel", { penalty: multipleAttackPenalty.map3 }),
        ];
        const checkModifiers = [
            (otherModifiers: ModifierPF2e[]) => new CheckModifier(flavorText, action, otherModifiers),
            (otherModifiers: ModifierPF2e[]) =>
                new CheckModifier(flavorText, action, [
                    ...otherModifiers,
                    new ModifierPF2e(multipleAttackPenalty.label, multipleAttackPenalty.map2, MODIFIER_TYPE.UNTYPED),
                ]),
            (otherModifiers: ModifierPF2e[]) =>
                new CheckModifier(flavorText, action, [
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
                roll: async (args: StrikeRollParams): Promise<void> => {
                    if (weapon.requiresAmmo && !weapon.ammo) {
                        ui.notifications.warn(
                            game.i18n.format("PF2E.Strike.Ranged.NoAmmo", { weapon: weapon.name, actor: this.name })
                        );
                        return;
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
                        this.getRangePenalty(rangeIncrement, selectors, defaultOptions) ?? [],
                        context.self.modifiers,
                    ].flat();

                    // Collect roll options from all sources
                    args.options ??= [];
                    const options = [
                        args.options,
                        context.options,
                        action.options,
                        defaultOptions,
                        incrementOption,
                    ].flat();

                    // Get just-in-time roll options from rule elements
                    for (const rule of this.rules.filter((r) => !r.ignored)) {
                        rule.beforeRoll?.(baseSelectors, options);
                    }
                    const finalRollOptions = Array.from(new Set(options));

                    const dc = args.dc ?? context.target?.dc;
                    if (dc && action.adjustments) {
                        dc.adjustments = action.adjustments;
                    }

                    const item = context.self.item;
                    const traits = [attackTrait, [...item.traits].map((t) => toStrikeTrait(t))].flat();

                    const checkContext = {
                        actor: context.self.actor,
                        target: context.target,
                        item,
                        type: "attack-roll",
                        options: finalRollOptions,
                        notes,
                        dc,
                        traits,
                    };

                    if (!this.consumeAmmo(item, args)) return;

                    await CheckPF2e.roll(constructModifier(otherModifiers), checkContext, args.event, args.callback);
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
                    new Set([args.options, context.options, action.options, defaultOptions, incrementOption].flat())
                );
                const traits = [attackTrait, [...context.self.item.traits].map((t) => toStrikeTrait(t))].flat();

                const damage = WeaponDamagePF2e.calculate(
                    context.self.item.data,
                    context.self.actor,
                    traits,
                    statisticsModifiers,
                    this.cloneSyntheticsRecord(synthetics.damageDice),
                    proficiencyRank,
                    options,
                    rollNotes,
                    weaponPotency,
                    synthetics.striking
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

    /** Possibly modify this weapon depending on its */
    protected override getStrikeRollContext<I extends AttackItem>(
        params: StrikeRollContextParams<I>
    ): StrikeRollContext<this, I> {
        const context = super.getStrikeRollContext(params);
        if (context.self.item.isOfType("weapon")) {
            StrikeWeaponTraits.modifyWeapon(context.self.item);
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
        const item = this.physicalItems.get(itemId);
        if (!item?.traits.has("invested")) {
            throw ErrorPF2e("Unexpected error toggling item investment");
        }

        return !!(await item.update({ "data.invested.value": !item.isInvested }));
    }

    /** Add a proficiency in a weapon group or base weapon */
    async addCombatProficiency(key: BaseWeaponProficiencyKey | WeaponGroupProficiencyKey) {
        const currentProficiencies = this.data.data.martial;
        if (key in currentProficiencies) return;
        const newProficiency: CharacterProficiency = { rank: 0, value: 0, breakdown: "", custom: true };
        await this.update({ [`data.martial.${key}`]: newProficiency });
    }

    async removeCombatProficiency(key: BaseWeaponProficiencyKey | WeaponGroupProficiencyKey) {
        await this.update({ [`data.martial.-=${key}`]: null });
    }

    /**
     * Roll a Recovery Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     */
    rollRecovery(event: JQuery.TriggeredEvent) {
        const dying = this.data.data.attributes.dying.value;
        if (!dying) return;

        const translations = LocalizePF2e.translations.PF2E;
        const { Recovery } = translations;

        // const wounded = this.data.data.attributes.wounded.value; // not needed currently as the result is currently not automated
        const recoveryMod = this.data.data.attributes.dying.recoveryMod;

        const dc: CheckDC = {
            label: game.i18n.format(translations.Recovery.rollingDescription, {
                dying,
                dc: "{dc}", // Replace variable with variable, which will be replaced with the actual value in CheckModifiersDialog.Roll()
            }),
            value: 10 + recoveryMod + dying,
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

        CheckPF2e.roll(modifier, { actor: this, token, dc, notes }, event);

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
        const characterData = this.data.data;

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
                    characterData.attributes.sp.max
                );
            }

            // Do not allow resolve to go over max
            if (changed.data?.attributes?.resolve) {
                changed.data.attributes.resolve.value = Math.clamped(
                    changed.data?.attributes?.resolve?.value || 0,
                    0,
                    characterData.attributes.resolve.max
                );
            }
        }

        // Add or remove class features as necessary
        const newLevel = changed.data?.details?.level?.value ?? this.level;
        if (newLevel !== this.level) {
            await AncestryBackgroundClassManager.ensureClassFeaturesForLevel(this, newLevel);
        }

        await super._preUpdate(changed, options, user);
    }
}

export interface CharacterPF2e {
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

interface CharacterHitPointsSummary extends HitPointsSummary {
    recoveryMultiplier: number;
}
