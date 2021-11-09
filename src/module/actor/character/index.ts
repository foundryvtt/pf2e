import { ItemPF2e } from "@item/base";
import { getResiliencyBonus } from "@item/runes";
import {
    AbilityModifier,
    DEXTERITY,
    ensureProficiencyOption,
    CheckModifier,
    ModifierPF2e,
    MODIFIER_TYPE,
    StatisticModifier,
    ProficiencyModifier,
    WISDOM,
} from "@module/modifiers";
import { ensureWeaponCategory, ensureWeaponGroup, ensureWeaponSize, WeaponDamagePF2e } from "@system/damage/weapon";
import { CheckPF2e, DamageRollPF2e, RollParameters } from "@system/rolls";
import { SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY, SKILL_EXPANDED } from "../data/values";
import {
    BaseWeaponProficiencyKey,
    CharacterArmorClass,
    CharacterAttributes,
    CharacterData,
    CharacterProficiency,
    CharacterSaves,
    CharacterStrike,
    CharacterSystemData,
    CombatProficiencies,
    CombatProficiencyKey,
    WeaponGroupProficiencyKey,
    MagicTraditionProficiencies,
    LinkedProficiency,
} from "./data";
import { RollNotePF2e } from "@module/notes";
import {
    MultipleAttackPenaltyPF2e,
    RuleElementSynthetics,
    WeaponPotencyPF2e,
} from "@module/rules/rules-data-definitions";
import { ErrorPF2e, sluggify } from "@util";
import {
    AncestryPF2e,
    BackgroundPF2e,
    ClassPF2e,
    ConsumablePF2e,
    FeatPF2e,
    PhysicalItemPF2e,
    SpellPF2e,
    WeaponPF2e,
} from "@item";
import { CreaturePF2e } from "../";
import { LocalizePF2e } from "@module/system/localize";
import { AutomaticBonusProgression } from "@module/rules/automatic-bonus";
import { SpellAttackRollModifier, SpellDifficultyClass } from "@item/spellcasting-entry/data";
import { WeaponCategory, WeaponDamage, WeaponSource, WEAPON_CATEGORIES } from "@item/weapon/data";
import { ZeroToFour } from "@module/data";
import { AbilityString, PerceptionData, StrikeTrait } from "@actor/data/base";
import { CreatureSpeeds, LabeledSpeed, MovementType, SkillAbbreviation, SkillData } from "@actor/creature/data";
import { ArmorCategory, ARMOR_CATEGORIES } from "@item/armor/data";
import { ActiveEffectPF2e } from "@module/active-effect";
import { MAGIC_TRADITIONS } from "@item/spell/data";
import { CharacterSource } from "@actor/data";
import { PredicatePF2e } from "@system/predication";
import { AncestryBackgroundClassManager } from "@item/abc/manager";
import { CraftingFormula } from "@module/crafting/formula";
import { fromUUIDs } from "@util/from-uuids";
import { UserPF2e } from "@module/user";
import { CraftingEntry } from "@module/crafting/crafting-entry";
import { ActorSizePF2e } from "@actor/data/size";

export class CharacterPF2e extends CreaturePF2e {
    proficiencies!: Record<string, { name: string; rank: ZeroToFour } | undefined>;

    static override get schema(): typeof CharacterData {
        return CharacterData;
    }

    override get hitPoints(): { value: number; max: number; negativeHealing: boolean; recoveryMultiplier: number } {
        return {
            ...super.hitPoints,
            recoveryMultiplier: this.data.data.attributes.hp.recoveryMultiplier,
        };
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

    get heritage(): Embedded<FeatPF2e> | null {
        return this.itemTypes.feat.find((feat) => feat.featType.value === "heritage") ?? null;
    }

    get keyAbility(): AbilityString {
        return this.data.data.details.keyability.value || "str";
    }

    get heroPoints(): { value: number; max: number } {
        return deepClone(this.data.data.resources.heroPoints);
    }

    async getCraftingFormulas(): Promise<CraftingFormula[]> {
        const { formulas } = this.data.data.crafting;
        const formulaMap = new Map(formulas.map((data) => [data.uuid, data]));
        return (await fromUUIDs(formulas.map((data) => data.uuid)))
            .filter((item): item is PhysicalItemPF2e => item instanceof PhysicalItemPF2e)
            .map((item) => {
                const { dc, batchSize, deletable } = formulaMap.get(item.uuid) ?? { deletable: false };
                return new CraftingFormula(item, { dc, batchSize, deletable });
            });
    }

    async getCraftingEntries(): Promise<CraftingEntry[]> {
        const craftingFormulas = await this.getCraftingFormulas();
        const craftingEntriesData = this.data.data.crafting.entries;
        const entries: CraftingEntry[] = [];

        for (const key in craftingEntriesData) {
            if (craftingEntriesData[key]) {
                entries.push(new CraftingEntry(this, craftingFormulas, craftingEntriesData[key]));
            }
        }

        return entries;
    }

    async getCraftingEntry(selector: string): Promise<CraftingEntry | undefined> {
        const craftingFormulas = await this.getCraftingFormulas();
        const craftingEntryData = this.data.data.crafting.entries[selector];
        if (!craftingEntryData) return;
        return new CraftingEntry(this, craftingFormulas, craftingEntryData);
    }

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();
        const systemData: DeepPartial<CharacterSystemData> = this.data.data;

        // Flags
        this.data.flags.pf2e.freeCrafting ??= false;

        // Attributes
        const attributes: DeepPartial<CharacterAttributes> = this.data.data.attributes;
        attributes.ac = { modifiers: [] };
        attributes.classDC = { rank: 0 };
        attributes.dexCap = [{ value: Infinity, source: "" }];

        const perception = (attributes.perception ??= { ability: "wis", rank: 0 });
        perception.ability = "wis";
        perception.rank ??= 0;

        attributes.reach = { value: 5, manipulate: 5 };
        attributes.doomed = { value: 0, max: 3 };
        attributes.dying = { value: 0, max: 4 };
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
        const martial: DeepPartial<CombatProficiencies> = this.data.data.martial;
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

        // Decorate crafting formulas stored directly on the actor
        this.data.data.crafting.formulas.forEach((formula) => {
            formula.deletable = true;
        });

        // Toggles
        systemData.toggles = {
            actions: [
                {
                    label: "PF2E.TargetFlatFootedLabel",
                    inputName: `flags.pf2e.rollOptions.all.target:flatFooted`,
                    checked: this.getFlag("pf2e", "rollOptions.all.target:flatFooted"),
                },
            ],
        };
    }

    protected override async _preUpdate(
        data: DeepPartial<CharacterSource>,
        options: DocumentModificationContext,
        user: UserPF2e
    ): Promise<void> {
        const characterData = this.data.data;

        // Clamp Stamina and Resolve
        if (game.settings.get("pf2e", "staminaVariant")) {
            // Do not allow stamina to go over max
            if (data.data?.attributes?.sp) {
                data.data.attributes.sp.value = Math.clamped(
                    data.data?.attributes?.sp?.value || 0,
                    0,
                    characterData.attributes.sp.max
                );
            }

            // Do not allow resolve to go over max
            if (data.data?.attributes?.resolve) {
                data.data.attributes.resolve.value = Math.clamped(
                    data.data?.attributes?.resolve?.value || 0,
                    0,
                    characterData.attributes.resolve.max
                );
            }
        }

        // Add or remove class features as necessary
        const newLevel = data.data?.details?.level?.value ?? this.level;
        if (newLevel !== this.level) {
            await AncestryBackgroundClassManager.ensureClassFeaturesForLevel(this, newLevel);
        }

        await super._preUpdate(data, options, user);
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const rules = this.rules.filter((rule) => !rule.ignored);
        const systemData = this.data.data;

        // Compute ability modifiers from raw ability scores.
        for (const abl of Object.values(systemData.abilities)) {
            abl.mod = Math.floor((abl.value - 10) / 2);
        }

        const synthetics = this.prepareCustomModifiers(rules);
        if (!this.getFlag("pf2e", "disableABP")) {
            AutomaticBonusProgression.concatModifiers(this.level, synthetics);
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
            statisticsModifiers.all = (statisticsModifiers.all || []).concat(
                new ModifierPF2e("PF2E.PFS.LevelBump", 1, MODIFIER_TYPE.UNTYPED)
            );
        }

        // Calculate HP and SP
        {
            const ancestryHP = systemData.attributes.ancestryhp;
            const classHP = systemData.attributes.classhp;
            const hitPoints = systemData.attributes.hp;
            const modifiers = [new ModifierPF2e("PF2E.AncestryHP", ancestryHP, MODIFIER_TYPE.UNTYPED)];

            if (game.settings.get("pf2e", "staminaVariant")) {
                const bonusSpPerLevel = (systemData.attributes.levelbonussp ?? 1) * this.level;
                const halfClassHp = Math.floor(classHP / 2);
                systemData.attributes.sp.max =
                    (halfClassHp + systemData.abilities.con.mod) * this.level +
                    bonusSpPerLevel +
                    systemData.attributes.flatbonussp;
                systemData.attributes.resolve.max = systemData.abilities[systemData.details.keyability.value].mod;

                modifiers.push(new ModifierPF2e("PF2E.ClassHP", halfClassHp * this.level, MODIFIER_TYPE.UNTYPED));
            } else {
                modifiers.push(new ModifierPF2e("PF2E.ClassHP", classHP * this.level, MODIFIER_TYPE.UNTYPED));
                modifiers.push(
                    new ModifierPF2e(
                        "PF2E.AbilityCon",
                        systemData.abilities.con.mod * this.level,
                        MODIFIER_TYPE.ABILITY
                    )
                );
            }

            if (systemData.attributes.flatbonushp) {
                modifiers.push(
                    new ModifierPF2e("PF2E.FlatBonusHP", systemData.attributes.flatbonushp, MODIFIER_TYPE.UNTYPED)
                );
            }
            if (systemData.attributes.levelbonushp) {
                modifiers.push(
                    new ModifierPF2e(
                        "PF2E.BonusHPperLevel",
                        systemData.attributes.levelbonushp * this.level,
                        MODIFIER_TYPE.UNTYPED
                    )
                );
            }

            (statisticsModifiers.hp || [])
                .map((m) => m.clone())
                .forEach((m) => {
                    m.ignored = !m.predicate.test(this.getRollOptions(m.defaultRollOptions ?? ["hp", "all"]));
                    modifiers.push(m);
                });
            (statisticsModifiers["hp-per-level"] || [])
                .map((m) => m.clone())
                .forEach((m) => {
                    m.modifier *= this.level;
                    m.ignored = !m.predicate.test(this.getRollOptions(m.defaultRollOptions ?? ["hp-per-level", "all"]));
                    modifiers.push(m);
                });

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
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");

            systemData.attributes.hp = stat;
        }

        // Saves
        const { wornArmor } = this;
        for (const saveType of SAVE_TYPES) {
            const save = systemData.saves[saveType];
            // Base modifiers from ability scores & level/proficiency rank.
            const abilityModifier = AbilityModifier.fromAbilityScore(
                save.ability,
                systemData.abilities[save.ability].value
            );
            const modifiers = [abilityModifier, ProficiencyModifier.fromLevelAndRank(this.level, save.rank)];
            const notes: RollNotePF2e[] = [];

            // Add resilient bonuses for wearing armor with a resilient rune.
            if (wornArmor?.data.data.resiliencyRune.value) {
                const resilientBonus = getResiliencyBonus(wornArmor.data.data);
                if (resilientBonus > 0 && wornArmor.isInvested) {
                    modifiers.push(new ModifierPF2e(wornArmor.name, resilientBonus, MODIFIER_TYPE.ITEM));
                }
            }

            if (saveType === "reflex" && wornArmor?.traits.has("bulwark")) {
                const bulwarkModifier = new ModifierPF2e(CONFIG.PF2E.armorTraits.bulwark, 3, MODIFIER_TYPE.UNTYPED);
                bulwarkModifier.predicate = new PredicatePF2e({
                    all: ["damaging-effect"],
                    not: ["self:armor:bulwark-all"],
                });
                modifiers.push(bulwarkModifier);
                abilityModifier.predicate.not.push(
                    { and: ["self:armor:trait:bulwark", "damaging-effect"] },
                    "self:armor:bulwark-all"
                );
            }

            // Add custom modifiers and roll notes relevant to this save.
            const rollOptions = [saveType, `${save.ability}-based`, "saving-throw", "all"];
            rollOptions.forEach((key) => {
                (statisticsModifiers[key] || [])
                    .map((m) => m.clone())
                    .forEach((m) => {
                        m.ignored = !m.predicate.test(this.getRollOptions(m.defaultRollOptions ?? rollOptions));
                        modifiers.push(m);
                    });
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });
            for (const modifier of modifiers) {
                modifier.ignored = !modifier.predicate.test(
                    this.getRollOptions(modifier.defaultRollOptions ?? rollOptions)
                );
            }

            // Create a new modifier from the modifiers, then merge in other fields from the old save data, and finally
            // overwrite potentially changed fields.
            const stat = mergeObject(new StatisticModifier(saveType, modifiers), save, { overwrite: false });
            stat.notes = notes;
            stat.value = stat.totalModifier;
            stat.breakdown = (stat.modifiers as ModifierPF2e[])
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            stat.roll = (args: RollParameters) => {
                const label = game.i18n.format("PF2E.SavingThrowWithName", {
                    saveName: game.i18n.localize(CONFIG.PF2E.saves[saveType]),
                });
                const options = args.options ?? [];
                ensureProficiencyOption(options, save.rank);
                if (args.dc && stat.adjustments) {
                    args.dc.adjustments = stat.adjustments;
                }
                CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: "saving-throw", options, dc: args.dc, notes },
                    args.event,
                    args.callback
                );
            };

            systemData.saves[saveType] = stat;
        }

        // Attack and defense proficiencies
        const combatProficiencies = Object.values(systemData.martial);
        for (const proficiency of combatProficiencies) {
            if ("predicate" in proficiency) continue;
            const proficiencyBonus = ProficiencyModifier.fromLevelAndRank(this.level, proficiency.rank || 0);
            proficiency.value = proficiencyBonus.modifier;
            const label = game.i18n.localize(proficiencyBonus.name);
            const sign = proficiencyBonus.modifier < 0 ? "" : "+";
            proficiency.breakdown = `${label} ${sign}${proficiencyBonus.modifier}`;
        }

        const linkedProficiencies = combatProficiencies.filter((p): p is LinkedProficiency => "predicate" in p);
        for (const proficiency of linkedProficiencies) {
            const category = systemData.martial[proficiency.sameAs];
            proficiency.rank = category.rank;
            proficiency.value = category.value;
            proficiency.breakdown = category.breakdown;
        }

        // Perception
        {
            const proficiencyRank = systemData.attributes.perception.rank || 0;
            const modifiers = [
                WISDOM.withScore(systemData.abilities.wis.value),
                ProficiencyModifier.fromLevelAndRank(this.level, proficiencyRank),
            ];

            const notes: RollNotePF2e[] = [];
            const rollOptions = ["perception", "wis-based", "all"];
            rollOptions.forEach((key) => {
                (statisticsModifiers[key] || [])
                    .map((m) => m.clone())
                    .forEach((m) => {
                        m.ignored = !m.predicate.test(this.getRollOptions(m.defaultRollOptions ?? rollOptions));
                        modifiers.push(m);
                    });
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const stat = mergeObject(new StatisticModifier("perception", modifiers), systemData.attributes.perception, {
                overwrite: false,
            });
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            stat.notes = notes;
            stat.value = stat.totalModifier;
            stat.roll = (args: RollParameters) => {
                const label = game.i18n.localize("PF2E.PerceptionCheck");
                const options = args.options ?? [];
                ensureProficiencyOption(options, proficiencyRank);
                if (args.dc && stat.adjustments) {
                    args.dc.adjustments = stat.adjustments;
                }
                CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: "perception-check", options, dc: args.dc, notes },
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
            const modifiers = [
                AbilityModifier.fromAbilityScore(
                    systemData.details.keyability.value,
                    systemData.abilities[systemData.details.keyability.value].value
                ),
                ProficiencyModifier.fromLevelAndRank(this.level, systemData.attributes.classDC.rank ?? 0),
            ];
            const notes: RollNotePF2e[] = [];
            const rollOptions = ["class", `${systemData.details.keyability.value}-based`, "all"];
            rollOptions.forEach((key) => {
                (statisticsModifiers[key] || [])
                    .map((m) => m.clone())
                    .forEach((m) => {
                        m.ignored = !m.predicate.test(this.getRollOptions(m.defaultRollOptions ?? rollOptions));
                        modifiers.push(m);
                    });
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const stat = mergeObject(new StatisticModifier("class", modifiers), systemData.attributes.classDC, {
                overwrite: false,
            });
            stat.value = 10 + stat.totalModifier;
            stat.ability = systemData.details.keyability.value;
            stat.breakdown = [game.i18n.localize("PF2E.ClassDCBase")]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                )
                .join(", ");

            systemData.attributes.classDC = stat;
        }

        // Armor Class
        {
            const modifiers = [...systemData.attributes.ac.modifiers];
            const dexCapSources = systemData.attributes.dexCap;
            let armorCheckPenalty = 0;
            let proficiency: ArmorCategory = "unarmored";

            if (wornArmor) {
                dexCapSources.push({ value: Number(wornArmor.dexCap ?? 0), source: wornArmor.name });
                if (wornArmor.checkPenalty) {
                    proficiency = wornArmor.category;
                    // armor check penalty
                    if (typeof wornArmor.strength === "number" && systemData.abilities.str.value < wornArmor.strength) {
                        armorCheckPenalty = Number(wornArmor.checkPenalty ?? 0);
                    }
                }

                modifiers.push(new ModifierPF2e(wornArmor.name, wornArmor.acBonus, MODIFIER_TYPE.ITEM));
            }

            // proficiency
            modifiers.unshift(
                ProficiencyModifier.fromLevelAndRank(this.level, systemData.martial[proficiency]?.rank ?? 0)
            );

            // Dex modifier limited by the lowest dex cap, for example from armor
            const dexterity = DEXTERITY.withScore(systemData.abilities.dex.value);
            dexterity.modifier = Math.min(dexterity.modifier, ...dexCapSources.map((cap) => cap.value));
            modifiers.unshift(dexterity);

            // condition and custom modifiers
            const rollOptions = ["ac", "dex-based", "all"];
            rollOptions.forEach((key) => {
                (statisticsModifiers[key] || [])
                    .map((m) => m.clone())
                    .forEach((m) => {
                        m.ignored = !m.predicate.test(this.getRollOptions(m.defaultRollOptions ?? rollOptions));
                        modifiers.push(m);
                    });
            });

            const dexCap = dexCapSources.reduce((result, current) => (result.value > current.value ? current : result));

            const stat: CharacterArmorClass = mergeObject(new StatisticModifier("ac", modifiers), {
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
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                )
                .join(", ");

            systemData.attributes.ac = stat;
        }

        // Shield
        const { heldShield } = this;
        if (heldShield) {
            const { hitPoints } = heldShield;
            systemData.attributes.shield.value = hitPoints.value;
            systemData.attributes.shield.max = hitPoints.max;

            if (heldShield.speedPenalty) {
                const speedPenalty = new ModifierPF2e(heldShield.name, heldShield.speedPenalty, MODIFIER_TYPE.UNTYPED);
                speedPenalty.predicate.not = ["self:shield:ignore-speed-penalty"];
                statisticsModifiers.speed ??= [];
                statisticsModifiers.speed.push(speedPenalty);
            }
        }

        // Skill modifiers

        // rebuild the skills object to clear out any deleted or renamed skills from previous iterations
        const skills: Partial<CharacterSystemData["skills"]> = {};

        for (const shortForm of SKILL_ABBREVIATIONS) {
            const skill = systemData.skills[shortForm];
            const modifiers = [
                AbilityModifier.fromAbilityScore(skill.ability, systemData.abilities[skill.ability].value),
                ProficiencyModifier.fromLevelAndRank(this.level, skill.rank),
            ];
            const notes: RollNotePF2e[] = [];
            // workaround for the shortform skill names
            const longForm = SKILL_DICTIONARY[shortForm];

            // Indicate that the strength requirement of this actor's armor is met
            if (typeof wornArmor?.strength === "number" && this.data.data.abilities.str.value >= wornArmor.strength) {
                for (const selector of ["skill-check", "initiative"]) {
                    const rollOptions = (this.rollOptions[selector] ??= {});
                    rollOptions["self:armor:strength-requirement-met"] = true;
                }
            }

            if (skill.armor && typeof wornArmor?.checkPenalty === "number") {
                const armorCheckPenalty = new ModifierPF2e(
                    "PF2E.ArmorCheckPenalty",
                    wornArmor.checkPenalty,
                    MODIFIER_TYPE.UNTYPED
                );

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

            const rollOptions = [longForm, `${skill.ability}-based`, "skill-check", "all"];
            rollOptions.forEach((key) => {
                (statisticsModifiers[key] || [])
                    .map((m) => m.clone())
                    .forEach((m) => {
                        m.ignored = !m.predicate.test(this.getRollOptions(m.defaultRollOptions ?? rollOptions));
                        modifiers.push(m);
                    });
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            for (const modifier of modifiers) {
                modifier.ignored = !modifier.predicate.test?.(
                    this.getRollOptions([longForm, `${skill.ability}-based`, "skill-check", "all"])
                );
            }

            const stat = mergeObject(new StatisticModifier(longForm, modifiers), skill, {
                overwrite: false,
            });
            stat.breakdown = stat.modifiers
                .filter((modifier) => modifier.enabled)
                .map((modifier) => {
                    const prefix = modifier.modifier < 0 ? "" : "+";
                    return `${game.i18n.localize(modifier.name)} ${prefix}${modifier.modifier}`;
                })
                .join(", ");
            stat.value = stat.totalModifier;
            stat.notes = notes;
            stat.rank = skill.rank;
            stat.roll = (args: RollParameters) => {
                const label = game.i18n.format("PF2E.SkillCheckWithName", {
                    skillName: game.i18n.localize(CONFIG.PF2E.skills[shortForm]),
                });
                const options = args.options ?? [];
                ensureProficiencyOption(options, skill.rank);
                if (args.dc && stat.adjustments) {
                    args.dc.adjustments = stat.adjustments;
                }
                CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: "skill-check", options, dc: args.dc, notes },
                    args.event,
                    args.callback
                );
            };

            skills[shortForm] = stat;
        }

        // Lore skills
        itemTypes.lore
            .map((loreItem) => loreItem.data)
            .forEach((skill) => {
                // normalize skill name to lower-case and dash-separated words
                const shortform = skill.name.toLowerCase().replace(/\s+/g, "-") as SkillAbbreviation;
                const rank = skill.data.proficient.value;

                const modifiers = [
                    AbilityModifier.fromAbilityScore("int", systemData.abilities.int.value),
                    ProficiencyModifier.fromLevelAndRank(this.level, rank),
                ];
                const notes: RollNotePF2e[] = [];
                const rollOptions = [shortform, `int-based`, "skill-check", "all"];
                rollOptions.forEach((key) => {
                    (statisticsModifiers[key] || [])
                        .map((m) => m.clone())
                        .forEach((m) => {
                            m.ignored = !m.predicate.test(this.getRollOptions(m.defaultRollOptions ?? rollOptions));
                            modifiers.push(m);
                        });
                    (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
                });

                const loreSkill = systemData.skills[shortform];
                const stat = mergeObject(new StatisticModifier(skill.name, modifiers), loreSkill, {
                    overwrite: false,
                });
                stat.itemID = skill._id;
                stat.rank = rank ?? 0;
                stat.shortform = shortform;
                stat.expanded = skill;
                stat.value = stat.totalModifier;
                stat.lore = true;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    .join(", ");
                stat.roll = (args: RollParameters) => {
                    const label = game.i18n.format("PF2E.SkillCheckWithName", { skillName: skill.name });
                    const options = args.options ?? [];
                    ensureProficiencyOption(options, rank);
                    CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        { actor: this, type: "skill-check", options, dc: args.dc, notes },
                        args.event,
                        args.callback
                    );
                };

                skills[shortform] = stat;
            });

        systemData.skills = skills as Required<typeof skills>;

        // Speeds
        systemData.attributes.speed = this.prepareSpeed("land", synthetics);
        const { otherSpeeds } = systemData.attributes.speed;
        for (let idx = 0; idx < otherSpeeds.length; idx++) {
            otherSpeeds[idx] = this.prepareSpeed(otherSpeeds[idx].type, synthetics);
        }

        // Automatic Actions
        systemData.actions = [];

        // Strikes
        type ProficienciesBrief = Record<string, { rank: ZeroToFour; name: string }>;
        // Collect offensive combat proficiencies
        const getProficiencies = (
            translationMap: Record<string, string>,
            combatProficiencies: CombatProficiencies,
            prefix: string
        ): ProficienciesBrief => {
            const keys = Object.keys(combatProficiencies) as CombatProficiencyKey[];
            return keys
                .filter((key) => key.startsWith(prefix) && key.replace(prefix, "") in translationMap)
                .map((key) => ({ key, data: combatProficiencies[key] }))
                .reduce((accumulated: ProficienciesBrief, proficiency) => {
                    if (proficiency.data?.rank === undefined) {
                        return accumulated;
                    }
                    return {
                        ...accumulated,
                        [proficiency.key]: {
                            rank: proficiency.data.rank,
                            name: game.i18n.localize(translationMap[proficiency.key.replace(prefix, "")]),
                        },
                    };
                }, {});
        };
        const weaponMap = LocalizePF2e.translations.PF2E.Weapon.Base;
        const weaponProficiencies = getProficiencies(weaponMap, systemData.martial, "weapon-base-");
        const groupProficiencies = getProficiencies(CONFIG.PF2E.weaponGroups, systemData.martial, "weapon-group-");

        // Add any homebrew categories
        const homebrewCategoryTags = game.settings.get("pf2e", "homebrew.weaponCategories");
        const homebrewProficiencies = homebrewCategoryTags.reduce(
            (categories: Partial<Record<WeaponCategory, { name: string; rank: ZeroToFour }>>, category) =>
                mergeObject(categories, {
                    [category.id]: {
                        name: category.value,
                        rank: systemData.martial[category.id]?.rank ?? 0,
                    },
                }),
            {}
        );

        this.proficiencies = {
            simple: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.simple),
                rank: systemData.martial.simple.rank ?? 0,
            },
            martial: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.martial),
                rank: systemData.martial.martial.rank ?? 0,
            },
            advanced: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.advanced),
                rank: systemData.martial.advanced.rank ?? 0,
            },
            unarmed: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.unarmed),
                rank: systemData.martial.unarmed.rank ?? 0,
            },
            ...homebrewProficiencies,
            ...weaponProficiencies,
            ...groupProficiencies,
        };

        // Add a basic unarmed strike unless a fixed-proficiency rule element is in effect
        const unarmed = ((): Embedded<WeaponPF2e> => {
            const source: PreCreate<WeaponSource> & { data: { damage: Partial<WeaponDamage> } } = {
                _id: randomID(),
                name: game.i18n.localize("PF2E.WeaponTypeUnarmed"),
                type: "weapon",
                img: "systems/pf2e/icons/features/classes/powerful-fist.webp",
                data: {
                    slug: "unarmed",
                    baseItem: null,
                    ability: { value: "str" },
                    weaponType: { value: "unarmed" },
                    bonus: { value: 0 },
                    damage: { dice: 1, die: "d4", damageType: "bludgeoning" },
                    group: { value: "brawling" },
                    range: { value: "melee" },
                    strikingRune: { value: null },
                    traits: { value: ["agile", "finesse", "nonlethal", "unarmed"] },
                    equipped: {
                        value: true, // consider checking for free hands
                    },
                },
            };

            // powerful fist
            const fistFeat = itemTypes.feat.find((feat) =>
                ["powerful-fist", "martial-artist-dedication"].includes(feat.slug ?? "")
            );
            if (fistFeat) {
                source.name = LocalizePF2e.translations.PF2E.Weapon.Base.fist;
                source.data.slug = "fist";
                source.data.baseItem = "fist";
                source.data.damage.die = "d6";
            }

            return new WeaponPF2e(source, { parent: this }) as Embedded<WeaponPF2e>;
        })();
        synthetics.strikes.unshift(unarmed);

        const ammos = itemTypes.consumable.filter((item) => item.data.data.consumableType.value === "ammo");
        const offensiveCategories = WEAPON_CATEGORIES.concat(homebrewCategoryTags.map((tag) => tag.id));
        const weapons = [itemTypes.weapon, strikes].flat();
        systemData.actions = weapons.map((weapon) =>
            this.prepareStrike(weapon, { categories: offensiveCategories, synthetics, ammos })
        );

        for (const entry of itemTypes.spellcastingEntry) {
            const entryData = entry.data;
            const tradition = entry.tradition;
            const rank = (entry.data.data.proficiency.value = entry.rank);
            const ability = entry.ability;
            const baseModifiers = [
                AbilityModifier.fromAbilityScore(ability, systemData.abilities[ability].value),
                ProficiencyModifier.fromLevelAndRank(this.level, rank),
            ];
            const baseNotes: RollNotePF2e[] = [];
            const baseRollOptions = [`${ability}-based`, "all"];
            baseRollOptions.forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => m.clone()).forEach((m) => baseModifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => baseNotes.push(n));
            });

            {
                // add custom modifiers and roll notes relevant to the attack modifier for the spellcasting entry
                const modifiers = [...baseModifiers];
                const notes = [...baseNotes];
                const rollOptions = [`${tradition}-spell-attack`, "spell-attack", "attack", "attack-roll"];
                const combinedRollOptions = [...rollOptions, ...baseRollOptions];
                rollOptions.forEach((key) => {
                    (statisticsModifiers[key] || [])
                        .map((m) => m.clone())
                        .forEach((m) => {
                            m.ignored = !m.predicate.test(
                                this.getRollOptions(m.defaultRollOptions ?? combinedRollOptions)
                            );
                            modifiers.push(m);
                        });
                    (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
                });

                const attack: StatisticModifier & Partial<SpellAttackRollModifier> = new StatisticModifier(
                    entryData.name,
                    modifiers
                );
                attack.notes = notes;
                attack.value = attack.totalModifier;
                attack.breakdown = attack.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    .join(", ");
                attack.roll = (args: RollParameters) => {
                    if (!(args.item instanceof SpellPF2e)) throw ErrorPF2e("Unexpected error looking up spell to cast");

                    const label = game.i18n.format(`PF2E.SpellAttack.${tradition}`);
                    const ctx = this.createAttackRollContext(args.event!, ["all", "attack-roll", "spell-attack-roll"]);
                    const options = (args.options ?? []).concat(ctx.options);
                    ensureProficiencyOption(options, rank);
                    const allSpellTraits = {
                        ...CONFIG.PF2E.magicSchools,
                        ...CONFIG.PF2E.magicTraditions,
                        ...CONFIG.PF2E.spellTraits,
                    };
                    const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
                    const traits = [...args.item.traits].map((trait) => ({
                        name: trait,
                        label: allSpellTraits[trait],
                        toggle: false,
                        description: traitDescriptions[trait] ?? "",
                    }));
                    CheckPF2e.roll(
                        new CheckModifier(label, attack, args.modifiers ?? []),
                        {
                            actor: this,
                            item: args.item,
                            type: "spell-attack-roll",
                            options,
                            notes,
                            dc: args.dc ?? ctx.dc,
                            traits,
                        },
                        args.event,
                        args.callback
                    );
                };
                entryData.data.attack = attack as Required<SpellAttackRollModifier>;
            }

            {
                // add custom modifiers and roll notes relevant to the DC for the spellcasting entry
                const modifiers = [...baseModifiers];
                const notes = [...baseNotes];
                const rollOptions = [`${tradition}-spell-dc`, "spell-dc"];
                const combinedRollOptions = [...rollOptions, ...baseRollOptions];
                rollOptions.forEach((key) => {
                    (statisticsModifiers[key] || [])
                        .map((m) => m.clone())
                        .forEach((m) => {
                            m.ignored = !m.predicate.test(
                                this.getRollOptions(m.defaultRollOptions ?? combinedRollOptions)
                            );
                            modifiers.push(m);
                        });
                    (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
                });

                const dc: StatisticModifier & Partial<SpellDifficultyClass> = new StatisticModifier(
                    entryData.name,
                    modifiers
                );
                dc.notes = notes;
                dc.value = 10 + dc.totalModifier;
                dc.breakdown = [game.i18n.localize("PF2E.SpellDCBase")]
                    .concat(
                        dc.modifiers
                            .filter((m) => m.enabled)
                            .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    )
                    .join(", ");
                entryData.data.dc = dc as Required<SpellDifficultyClass>;
            }
        }

        // Resources
        const { resources } = this.data.data;
        resources.focus.max = Math.clamped(resources.focus.max, 0, 3);
        // Ensure the character has a focus pool of at least one point if they have a focus spellcasting entry
        if (!resources.focus.max && this.spellcasting.some((entry) => entry.isFocusPool)) {
            resources.focus.max = 1;
        }

        this.prepareInitiative(this.data, statisticsModifiers, rollNotes);

        rules.forEach((rule) => {
            try {
                rule.onAfterPrepareData(this.data, synthetics);
            } catch (error) {
                // ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onAfterPrepareData on rule element ${rule}.`, error);
            }
        });
    }

    override prepareSpeed(movementType: "land", synthetics: RuleElementSynthetics): CreatureSpeeds;
    override prepareSpeed(
        movementType: Exclude<MovementType, "land">,
        synthetics: RuleElementSynthetics
    ): LabeledSpeed & StatisticModifier;
    override prepareSpeed(
        movementType: MovementType,
        synthetics: RuleElementSynthetics
    ): CreatureSpeeds | (LabeledSpeed & StatisticModifier);
    override prepareSpeed(
        movementType: MovementType,
        synthetics: RuleElementSynthetics
    ): CreatureSpeeds | (LabeledSpeed & StatisticModifier) {
        const { wornArmor } = this;
        const basePenalty = wornArmor?.speedPenalty ?? 0;
        const strength = this.data.data.abilities.str.value;
        const requirement = wornArmor?.strength ?? strength;
        const value = strength >= requirement ? Math.min(basePenalty + 5, 0) : basePenalty;

        const modifierName = wornArmor?.name ?? "PF2E.ArmorSpeedLabel";
        const armorPenalty = value ? new ModifierPF2e(modifierName, value, "untyped") : null;
        if (armorPenalty) {
            const speedModifiers = (synthetics.statisticsModifiers.speed ??= []);
            armorPenalty.predicate.not = ["armor:ignore-speed-penalty"];
            armorPenalty.ignored = !armorPenalty.predicate.test(
                this.getRollOptions(["all", "speed", `${movementType}-speed`])
            );
            speedModifiers.push(armorPenalty);
        }
        return super.prepareSpeed(movementType, synthetics);
    }

    /** Prepare a strike action from a weapon */
    prepareStrike(
        weapon: Embedded<WeaponPF2e>,
        options: {
            categories: WeaponCategory[];
            synthetics: RuleElementSynthetics;
            ammos?: Embedded<ConsumablePF2e>[];
        }
    ): CharacterStrike {
        const itemData = weapon.data;
        const modifiers: ModifierPF2e[] = [];
        const weaponTraits = weapon.traits;
        const systemData = this.data.data;
        const { categories, synthetics } = options;
        const ammos = options.ammos ?? [];

        // Determine the base ability score for this attack.
        let ability: AbilityString;
        {
            ability = weapon.ability || "str"; // default to Str
            let score = systemData.abilities[ability]?.value ?? 0;
            // naive check for finesse, which should later be changed to take conditions like
            // enfeebled and clumsy into consideration
            if (weaponTraits.has("finesse") && systemData.abilities.dex.mod > systemData.abilities[ability].mod) {
                ability = "dex";
                score = systemData.abilities.dex.value;
            }
            modifiers.push(AbilityModifier.fromAbilityScore(ability, score));
        }

        // If the character has an ancestral weapon familiarity or similar feature, it will make weapons that meet
        // certain criteria also count as weapon of different category
        const categoryRank = systemData.martial[weapon.category]?.rank ?? 0;
        const groupRank = this.proficiencies[`weapon-group-${weapon.group}`]?.rank ?? 0;
        const equivalentWeapons: Record<string, string | undefined> = CONFIG.PF2E.equivalentWeapons;
        const baseWeapon = equivalentWeapons[weapon.baseType ?? ""] ?? weapon.baseType;
        const baseWeaponRank = this.proficiencies[`weapon-base-${baseWeapon}`]?.rank ?? 0;
        const linkedRank = ((): number => {
            const statements = weapon.getContextStrings();
            const linkedProficiency = Object.values(systemData.martial)
                .filter((p): p is LinkedProficiency => "sameAs" in p)
                .find((proficiency) => proficiency.predicate.test(statements));
            return linkedProficiency?.rank ?? 0;
        })();

        const proficiencyRank = Math.max(categoryRank, groupRank, baseWeaponRank, linkedRank);
        modifiers.push(ProficiencyModifier.fromLevelAndRank(this.level, proficiencyRank));

        const selectors = [
            "attack",
            "mundane-attack",
            `${ability}-attack`,
            `${ability}-based`,
            `${weapon.id}-attack`,
            `${sluggify(weapon.name)}-attack`,
            "attack-roll",
            "all",
        ];

        if (baseWeapon && !selectors.includes(`${baseWeapon}-attack`)) {
            selectors.push(`${baseWeapon}-attack`);
        }

        if (weapon.group) {
            selectors.push(`${weapon.group}-weapon-group-attack`);
        }

        const melee =
            ["melee", "reach", ""].includes(itemData.data.range?.value?.trim()) ||
            [...weaponTraits].some((thrown) => thrown.startsWith("thrown"));
        const defaultOptions = this.getRollOptions(["all", "attack-roll"])
            .concat(...weaponTraits) // always add weapon traits as options
            .concat([...weaponTraits].map((trait) => `trait:${trait}`)) // new standard form
            .concat(melee ? "melee" : "ranged")
            .concat(`${ability}-attack`);
        ensureProficiencyOption(defaultOptions, proficiencyRank);
        ensureWeaponCategory(defaultOptions, weapon.category);
        ensureWeaponGroup(defaultOptions, weapon.group);
        ensureWeaponSize(defaultOptions, weapon.size, this.size);
        const notes: RollNotePF2e[] = [];

        if (weapon.group === "bomb") {
            const attackBonus = Number(itemData.data.bonus?.value) || 0;
            if (attackBonus !== 0) {
                modifiers.push(new ModifierPF2e("PF2E.ItemBonusLabel", attackBonus, MODIFIER_TYPE.ITEM));
            }
        }

        // Conditions and Custom modifiers to attack rolls
        let weaponPotency: { label: string; bonus: number };
        const multipleAttackPenalty = ItemPF2e.calculateMap(itemData);
        {
            const potency: WeaponPotencyPF2e[] = [];
            const multipleAttackPenalties: MultipleAttackPenaltyPF2e[] = [];
            const { statisticsModifiers, rollNotes } = synthetics;
            selectors.forEach((key) => {
                (statisticsModifiers[key] ?? [])
                    .map((m) => m.clone())
                    .forEach((m) => {
                        m.ignored = !m.predicate.test(this.getRollOptions(m.defaultRollOptions ?? selectors));
                        modifiers.push(m);
                    });
                (synthetics.weaponPotency[key] ?? [])
                    .filter((wp) => PredicatePF2e.test(wp.predicate, defaultOptions))
                    .forEach((wp) => potency.push(wp));
                (synthetics.multipleAttackPenalties[key] ?? [])
                    .filter((map) => PredicatePF2e.test(map.predicate, defaultOptions))
                    .forEach((map) => multipleAttackPenalties.push(map));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            // find best weapon potency
            const potencyRune = Number(itemData.data.potencyRune?.value) || 0;
            if (potencyRune) {
                potency.push({ label: "PF2E.PotencyRuneLabel", bonus: potencyRune });
            }
            if (potency.length > 0) {
                weaponPotency = potency.reduce(
                    (highest, current) => (highest.bonus > current.bonus ? highest : current),
                    potency[0]
                );
                modifiers.push(new ModifierPF2e(weaponPotency.label, weaponPotency.bonus, MODIFIER_TYPE.ITEM));
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

        const flavor = this.getStrikeDescription(itemData);
        const strikeStat = new StatisticModifier(weapon.name, modifiers);
        const meleeUsage = weapon.toMeleeUsage();

        const action: CharacterStrike = mergeObject(strikeStat, {
            imageUrl: weapon.img,
            item: weapon.id,
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
            meleeUsage: meleeUsage ? this.prepareStrike(meleeUsage, { categories, synthetics }) : null,
        });

        // Define these as getters so that Foundry's TokenDocument#getBarAttribute method doesn't recurse infinitely
        Object.defineProperty(action, "origin", {
            get: () => this.items.get(weapon.id),
        });
        Object.defineProperty(action, "weapon", {
            get: () => weapon,
        });

        // Sets the ammo list if its an ammo using weapon group
        if (weapon.group && ["firearm", "bow", "sling", "dart"].includes(weapon.group)) {
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
            toggle: false,
        };
        action.traits = [attackTrait].concat(
            [...weaponTraits].map((trait) => {
                // Look up trait labels from `npcAttackTraits` instead of `weaponTraits` in case a battle form attack is
                // in use, which can include what are normally NPC-only traits
                const label = CONFIG.PF2E.npcAttackTraits[trait] ?? trait;
                const traitObject: StrikeTrait = {
                    name: trait,
                    label,
                    toggle: false,
                    description: traitDescriptions[trait] ?? "",
                };

                // look for toggleable traits
                if (trait.startsWith("two-hand-")) {
                    traitObject.rollName = "damage-roll";
                    traitObject.rollOption = "two-handed";
                } else if (trait.startsWith("versatile-")) {
                    traitObject.rollName = "damage-roll";
                    traitObject.rollOption = trait;
                }

                // trait can be toggled on/off
                if (traitObject.rollName && traitObject.rollOption) {
                    traitObject.toggle = true;
                    traitObject.cssClass = this.getRollOptions([traitObject.rollName]).includes(traitObject.rollOption)
                        ? "toggled-on"
                        : "toggled-off";
                }
                return traitObject;
            })
        );

        action.breakdown = action.modifiers
            .filter((m) => m.enabled)
            .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
            .join(", ");

        const strikeLabel = game.i18n.localize("PF2E.WeaponStrikeLabel");
        const flavorText = weapon.traits.has("combination")
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
            () => new CheckModifier(flavorText, action),
            () =>
                new CheckModifier(flavorText, action, [
                    new ModifierPF2e(multipleAttackPenalty.label, multipleAttackPenalty.map2, MODIFIER_TYPE.UNTYPED),
                ]),
            () =>
                new CheckModifier(flavorText, action, [
                    new ModifierPF2e(multipleAttackPenalty.label, multipleAttackPenalty.map3, MODIFIER_TYPE.UNTYPED),
                ]),
        ];

        action.variants = [0, 1, 2]
            .map((index): [string, () => CheckModifier] => [labels[index], checkModifiers[index]])
            .map(([label, constructModifier]) => ({
                label,
                roll: (args: RollParameters) => {
                    const context = this.createAttackRollContext(args.event!, ["all", "attack-roll"]);
                    const options = [
                        ...new Set([...(args.options ?? []), ...context.options, ...action.options, ...defaultOptions]),
                    ];
                    const dc = args.dc ?? context.dc;
                    if (dc && action.adjustments) {
                        dc.adjustments = action.adjustments;
                    }
                    CheckPF2e.roll(
                        constructModifier(),
                        { actor: this, item: weapon, type: "attack-roll", options, notes, dc, traits: action.traits },
                        args.event,
                        args.callback
                    );
                },
            }));
        action.attack = action.roll = action.variants[0].roll;

        for (const method of ["damage", "critical"] as const) {
            action[method] = (args: RollParameters): string | void => {
                const ctx = this.createDamageRollContext(args.event!);
                const options = (args.options ?? []).concat(ctx.options).concat(action.options).concat(defaultOptions);
                const damage = WeaponDamagePF2e.calculate(
                    itemData,
                    this,
                    action.traits,
                    synthetics.statisticsModifiers,
                    synthetics.damageDice,
                    proficiencyRank,
                    options,
                    synthetics.rollNotes,
                    weaponPotency,
                    synthetics.striking
                );
                const outcome = method === "damage" ? "success" : "criticalSuccess";
                if (args.getFormula) {
                    return damage.formula[outcome].formula;
                } else {
                    DamageRollPF2e.roll(
                        damage,
                        { type: "damage-roll", item: weapon, actor: this, outcome, options },
                        args.event,
                        args.callback
                    );
                }
            };
        }

        return action;
    }

    private prepareInitiative(
        actorData: CharacterData,
        statisticsModifiers: Record<string, ModifierPF2e[]>,
        rollNotes: Record<string, RollNotePF2e[]>
    ) {
        const { data } = actorData;
        const initSkill = data.attributes?.initiative?.ability || "perception";
        const modifiers: ModifierPF2e[] = [];
        const notes: RollNotePF2e[] = [];

        ["initiative"].forEach((key) => {
            const skillFullName = SKILL_DICTIONARY[initSkill as SkillAbbreviation] ?? initSkill;
            (statisticsModifiers[key] || [])
                .map((m) => m.clone())
                .forEach((m) => {
                    // checks if predicated rule is true with only skill name option
                    if (m.predicate && PredicatePF2e.test(m.predicate, [skillFullName])) {
                        // toggles these so the predicate rule will be included when totalmodifier is calculated
                        m.enabled = true;
                        m.ignored = false;
                    }
                    modifiers.push(m);
                });
            (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
        });
        const initStat: PerceptionData | SkillData =
            initSkill === "perception" ? data.attributes.perception : data.skills[initSkill as SkillAbbreviation];
        const skillName = game.i18n.localize(
            initSkill === "perception" ? "PF2E.PerceptionLabel" : CONFIG.PF2E.skills[initSkill as SkillAbbreviation]
        );

        const stat = new CheckModifier("initiative", initStat, modifiers);
        stat.ability = initSkill;
        stat.label = game.i18n.format("PF2E.InitiativeWithSkill", { skillName });
        stat.roll = (args: RollParameters) => {
            const skillFullName = SKILL_DICTIONARY[stat.ability as SkillAbbreviation] ?? "perception";
            const options = args.options ?? [];
            // push skill name to options if not already there
            if (!options.includes(skillFullName)) {
                options.push(skillFullName);
            }
            ensureProficiencyOption(options, initStat.rank ?? -1);
            CheckPF2e.roll(
                new CheckModifier(data.attributes.initiative.label, data.attributes.initiative),
                { actor: this, type: "initiative", options, notes, dc: args.dc },
                args.event,
                (roll) => {
                    this._applyInitiativeRollToCombatTracker(roll);
                }
            );
        };

        data.attributes.initiative = stat;
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
