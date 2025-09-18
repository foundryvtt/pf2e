import { CreaturePF2e, type FamiliarPF2e } from "@actor";
import { Abilities } from "@actor/creature/data.ts";
import { CreatureUpdateCallbackOptions, ResourceData } from "@actor/creature/types.ts";
import { ALLIANCES, SAVING_THROW_ATTRIBUTES } from "@actor/creature/values.ts";
import { StrikeData } from "@actor/data/base.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import {
    MultipleAttackPenaltyData,
    calculateMAPs,
    getStrikeAttackDomains,
    getStrikeDamageDomains,
    isReallyPC,
    setHitPointsRollOptions,
} from "@actor/helpers.ts";
import { ActorInitiative } from "@actor/initiative.ts";
import {
    CheckModifier,
    Modifier,
    ModifierType,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
    adjustModifiers,
    createAttributeModifier,
    createProficiencyModifier,
} from "@actor/modifiers.ts";
import { CheckContext } from "@actor/roll-context/check.ts";
import { DamageContext } from "@actor/roll-context/damage.ts";
import type { AttributeString, SkillSlug } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS, SAVE_TYPES } from "@actor/values.ts";
import type { Rolled } from "@client/dice/_module.d.mts";
import type {
    AncestryPF2e,
    BackgroundPF2e,
    ClassPF2e,
    ConsumablePF2e,
    DeityPF2e,
    FeatPF2e,
    HeritagePF2e,
    ItemPF2e,
} from "@item";
import { WeaponPF2e } from "@item";
import type { AbilityTrait } from "@item/ability/types.ts";
import { ARMOR_CATEGORIES } from "@item/armor/values.ts";
import type { ItemType } from "@item/base/data/index.ts";
import { getPropertyRuneDegreeAdjustments, getPropertyRuneStrikeAdjustments } from "@item/physical/runes.ts";
import type { WeaponSource } from "@item/weapon/data.ts";
import { processTwoHandTrait } from "@item/weapon/helpers.ts";
import type { WeaponCategory } from "@item/weapon/types.ts";
import { PROFICIENCY_RANKS, ZeroToFour, ZeroToTwo } from "@module/data.ts";
import {
    extractDegreeOfSuccessAdjustments,
    extractModifierAdjustments,
    extractModifiers,
    extractNotes,
    extractRollSubstitutions,
    extractRollTwice,
} from "@module/rules/helpers.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { Check, CheckCheckContext, CheckRoll } from "@system/check/index.ts";
import { DamageDamageContext, DamagePF2e, DamageType } from "@system/damage/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { DAMAGE_TYPE_ICONS } from "@system/damage/values.ts";
import { WeaponDamagePF2e } from "@system/damage/weapon.ts";
import { Predicate } from "@system/predication.ts";
import { AttackRollParams, DamageRollParams, RollParameters } from "@system/rolls.ts";
import { ArmorStatistic, PerceptionStatistic, Statistic } from "@system/statistic/index.ts";
import { ErrorPF2e, setHasElement, signedInteger, sluggify } from "@util/misc.ts";
import { traitSlugToObject } from "@util/tags.ts";
import * as R from "remeda";
import { CharacterCrafting } from "./crafting/index.ts";
import {
    BaseWeaponProficiencyKey,
    CharacterAbilities,
    CharacterAttributes,
    CharacterFlags,
    CharacterSkillData,
    CharacterSource,
    CharacterStrike,
    CharacterSystemData,
    ClassDCData,
    MartialProficiency,
    WeaponGroupProficiencyKey,
} from "./data.ts";
import { CharacterFeats } from "./feats/index.ts";
import {
    PCAttackTraitHelpers,
    WeaponAuxiliaryAction,
    createForceOpenPenalty,
    createHinderingPenalty,
    createShoddyPenalty,
    getItemProficiencyRank,
    imposeOversizedWeaponCondition,
} from "./helpers.ts";
import { CharacterSheetTabVisibility } from "./sheet.ts";
import {
    CharacterHitPointsSummary,
    CharacterSkill,
    CharacterSkills,
    DexterityModifierCapData,
    GuaranteedGetStatisticSlug,
} from "./types.ts";
import { CHARACTER_SHEET_TABS } from "./values.ts";

class CharacterPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends CreaturePF2e<TParent> {
    /** Core singular embeds for PCs */
    declare ancestry: AncestryPF2e<this> | null;
    declare heritage: HeritagePF2e<this> | null;
    declare background: BackgroundPF2e<this> | null;
    declare class: ClassPF2e<this> | null;
    declare deity: DeityPF2e<this> | null;

    /** A cached reference to this PC's familiar */
    declare familiar: FamiliarPF2e | null;

    declare feats: CharacterFeats<this>;
    declare pfsBoons: FeatPF2e<this>[];
    declare divineIntercessions: FeatPF2e<this>[];

    /** The primary class DC */
    declare classDC: Statistic | null;
    /** All class DCs, including the primary */
    declare classDCs: Record<string, Statistic>;
    /** Skills for the character, built during data prep */
    declare skills: CharacterSkills<this>;

    declare initiative: ActorInitiative;

    declare crafting: CharacterCrafting;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        const buildItems = ["ancestry", "heritage", "background", "class", "deity", "feat"] as const;
        return [
            ...super.allowedItemTypes,
            ...buildItems,
            "physical",
            "spellcastingEntry",
            "spell",
            "action",
            "lore",
            "kit",
        ];
    }

    get keyAttribute(): AttributeString {
        return this.system.details.keyability.value || "str";
    }

    /** This PC's ability scores */
    override get abilities(): CharacterAbilities {
        return fu.deepClone(this.system.abilities);
    }

    get handsFree(): ZeroToTwo {
        const heldItems = this.inventory.filter((i) => i.isHeld && i.type !== "shield" && !i.traits.has("free-hand"));
        return Math.clamp(2 - R.sumBy(heldItems, (i) => i.handsHeld), 0, 2) as ZeroToTwo;
    }

    /** The number of hands this PC "really" has free, ignoring allowances for shields and the Free-Hand trait */
    get handsReallyFree(): ZeroToTwo {
        const heldItems = this.inventory.filter((i) => i.isHeld);
        return Math.clamp(2 - R.sumBy(heldItems, (i) => i.handsHeld), 0, 2) as ZeroToTwo;
    }

    override get hitPoints(): CharacterHitPointsSummary {
        return {
            ...super.hitPoints,
            recoveryMultiplier: this.system.attributes.hp.recoveryMultiplier,
            recoveryAddend: this.system.attributes.hp.recoveryAddend,
        };
    }

    get heroPoints(): { value: number; max: number } {
        return fu.deepClone(this.system.resources.heroPoints);
    }

    /** Retrieve lore skills, class statistics, and tradition-specific spellcasting */
    override getStatistic(slug: GuaranteedGetStatisticSlug): Statistic<this>;
    override getStatistic(slug: string, options?: { item: ItemPF2e | null }): Statistic<this> | null;
    override getStatistic(slug: string, options?: { item: ItemPF2e | null }): Statistic | null {
        switch (slug) {
            case "class":
            case "class-dc":
            case "classDC":
                return this.classDC;
            case "class-spell": {
                const highestClass = Object.values(this.classDCs)
                    .sort((a, b) => b.mod - a.mod)
                    .shift();
                const highestSpell = this.spellcasting.contents
                    .flatMap((s) => s.statistic ?? [])
                    .sort((a, b) => b.mod - a.mod)
                    .shift();
                return (
                    [highestClass, highestSpell]
                        .filter(R.isTruthy)
                        .sort((a, b) => b.mod - a.mod)
                        .shift() ?? null
                );
            }
            case "base-spellcasting":
                return this.spellcasting.base;
        }

        return this.classDCs[slug] ?? super.getStatistic(slug, options);
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this.familiar ??= null;
        super._initialize(options);
    }

    /** If one exists, prepare this character's familiar */
    override prepareData(): void {
        super.prepareData();

        if (game.ready && this.familiar && game.actors.has(this.familiar.id)) {
            this.familiar.reset({ fromMaster: true });
        }
    }

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();

        const levelData = this.system.details.level;
        if (!Number.isInteger(levelData.value) || levelData.value < 0) {
            levelData.value = 1;
        }

        // Traits
        this.system.traits = {
            value: [],
            rarity: "unique", // 🦋
            size: new ActorSizePF2e({ value: "med" }),
        };

        // Flags
        const flags = this.flags;
        flags.pf2e.favoredWeaponRank = 0;
        flags.pf2e.freeCrafting ??= false;
        flags.pf2e.quickAlchemy ??= false;
        flags.pf2e.sheetTabs = fu.mergeObject(
            CHARACTER_SHEET_TABS.reduce(
                (tabs, tab) => ({
                    ...tabs,
                    [tab]: true,
                }),
                {} as CharacterSheetTabVisibility,
            ),
            flags.pf2e.sheetTabs ?? {},
        );
        flags.pf2e.showBasicUnarmed ??= true;
        flags.pf2e.featLimits ??= {};

        // Build selections: boosts and skill trainings
        const isGradual = game.pf2e.settings.variants.gab;
        const boostLevels = [1, 5, 10, 15, 20] as const;
        const allowedBoosts = boostLevels.reduce(
            (result, level) => {
                const allowed = (() => {
                    if (this.level === 0 && level === 1) return 4;
                    if (isGradual) return 4 - Math.clamp(level - this.level, 0, 4);
                    return this.level >= level ? 4 : 0;
                })();

                result[level] = allowed;
                return result;
            },
            {} as Record<(typeof boostLevels)[number], number>,
        );

        // Base attributes data
        const manualAttributes = Object.keys(this.system.abilities ?? {}).length > 0;
        this.system.abilities = R.mapToObj(Array.from(ATTRIBUTE_ABBREVIATIONS), (a) => [
            a,
            fu.mergeObject({ mod: 0 }, this.system.abilities?.[a] ?? {}),
        ]);

        this.system.perception.rank = 0;

        type SystemDataPartial = DeepPartial<
            Pick<CharacterSystemData, "build" | "crafting" | "perception" | "proficiencies" | "saves" | "skills">
        > & { abilities: Abilities };
        const system: SystemDataPartial = this.system;
        const existingBoosts = system.build?.attributes?.boosts;
        const isABP = game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(this);

        system.build = {
            attributes: {
                manual: manualAttributes,
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
                flaws: { ancestry: [] },
                apex: isABP ? (system.build?.attributes?.apex ?? null) : null,
            },
            languages: { value: 0, max: 0, granted: [] },
        };

        // Base saves structure
        system.saves = R.mapToObj(SAVE_TYPES, (t) => [t, { rank: 0, attribute: SAVING_THROW_ATTRIBUTES[t] }]);

        // Actor document and data properties from items
        const details = this.system.details;
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
        const attributes: Partial<CharacterAttributes> = this.system.attributes;
        attributes.classDC = null;
        attributes.spellDC = null;
        attributes.classOrSpellDC = { rank: 0, value: 0 };

        // Hit points
        const hitPoints = this.system.attributes.hp;
        hitPoints.recoveryMultiplier = 1;
        hitPoints.recoveryAddend = 0;
        attributes.ancestryhp = 0;
        attributes.classhp = 0;

        // Skills
        system.skills = R.mapToObj(R.entries(CONFIG.PF2E.skills), ([key, { attribute }]) => {
            const rank = Math.clamp(this._source.system.skills[key]?.rank || 0, 0, 4) as ZeroToFour;
            return [key, { rank, attribute, armor: ["dex", "str"].includes(attribute) }];
        });

        // Familiar abilities
        attributes.familiarAbilities = { value: 0 };

        // Spellcasting-tradition proficiencies
        system.proficiencies = {
            ...system.proficiencies,
            classDCs: {},
        };
        system.proficiencies.spellcasting ??= { rank: 0 };

        // Resources (Mythic points replace hero points if the character is mythic)
        const { resources } = this.system;
        const isMythic =
            game.pf2e.settings.campaign.mythic !== "disabled" &&
            this.itemTypes.feat.some((f) => f.category === "calling");
        resources.heroPoints.max = isMythic ? 0 : 3;
        resources.investiture = { value: 0, max: 10 };
        resources.focus = {
            value: resources.focus?.value || 0,
            max: 0,
            cap: 3,
        };
        resources.crafting = fu.mergeObject({ infusedReagents: { value: 0, max: 0 } }, resources.crafting ?? {});
        resources.crafting.infusedReagents.max = 0;
        resources.mythicPoints = { value: resources.mythicPoints?.value ?? 0, max: isMythic ? 3 : 0 };

        // Size
        this.system.traits.size = new ActorSizePF2e({ value: "med" });

        // Attack and defense proficiencies
        type PartialMartialProficiency = Record<string, DeepPartial<MartialProficiency> | undefined>;
        const attacks: PartialMartialProficiency = (system.proficiencies.attacks ??= {});
        // Set custom attack proficiencies to be visible
        for (const attack of Object.values(attacks).filter(R.isDefined)) {
            attack.visible = true;
        }

        for (const category of Object.keys(CONFIG.PF2E.weaponCategories)) {
            attacks[category] = {
                rank: attacks[category]?.rank ?? 0,
                visible: true,
            };
        }

        const defenses: PartialMartialProficiency = (system.proficiencies.defenses ??= {});
        for (const category of ARMOR_CATEGORIES) {
            defenses[category] = {
                rank: defenses[category]?.rank ?? 0,
                visible: true,
            };
        }

        // Crafting
        system.crafting = fu.mergeObject({ formulas: [], entries: {} }, system.crafting ?? {});

        // PC level is never a derived number, so it can be set early
        this.rollOptions.all[`self:level:${this.level}`] = true;
    }

    /** After AE-likes have been applied, set numeric roll options */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();

        for (const attribute of Object.values(this.system.abilities)) {
            attribute.mod = Math.trunc(attribute.mod) || 0;
        }

        // Indicate that the strength requirement of this actor's armor is met
        const strengthRequirement = this.wornArmor?.system.strength;
        if (typeof strengthRequirement === "number" && this.system.abilities.str.mod >= strengthRequirement) {
            for (const selector of ["dex-skill-check", "str-skill-check"]) {
                const rollOptions = (this.rollOptions[selector] ??= {});
                rollOptions["armor:strength-requirement-met"] = true;
            }
        }

        const build = this.system.build;
        // Remove any unrecognized languages
        const sourceLanguages = this._source.system.details.languages.value.filter((l) => l in CONFIG.PF2E.languages);
        build.languages.granted = build.languages.granted.filter((l) => l.slug in CONFIG.PF2E.languages);
        const grantedLanguages = build.languages.granted.map((g) => g.slug);
        this.system.details.languages.value = R.unique([...sourceLanguages, ...grantedLanguages]);

        // When tallying the number of languages taken, make sure Common and its actual language aren't counted twice
        const commonAndCommon = (["common", game.pf2e.settings.campaign.languages.commonLanguage] as const).filter(
            R.isTruthy,
        );
        const hasCommonTwice =
            commonAndCommon.length === 2 &&
            commonAndCommon.every((l) => this.system.details.languages.value.includes(l));
        const countReducedBy = hasCommonTwice ? 1 : 0;
        build.languages.value = sourceLanguages.filter((l) => !grantedLanguages.includes(l)).length - countReducedBy;
        build.languages.max += Math.max(this.system.abilities.int.mod, 0);

        this.setNumericRollOptions();
        this.deity?.setFavoredWeaponRank();
    }

    /**
     * Immediately after boosts from this PC's ancestry, background, and class have been acquired, set attribute
     * modifiers according to them.
     */
    override prepareDataFromItems(): void {
        // Set up feat hierarchies first, so that we know who is a parent of whom later
        for (const feat of this.itemTypes.feat) {
            feat.establishHierarchy();
        }

        super.prepareDataFromItems();
        this.prepareBuildData();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        // Create the crafting sub-object, and ensure the instance is maintained between data preparations
        this.crafting ??= new CharacterCrafting(this);
        this.crafting.initialize();

        imposeOversizedWeaponCondition(this);
        game.pf2e.variantRules.AutomaticBonusProgression.concatModifiers(this);
        const { synthetics, system } = this;

        // Update experience percentage from raw experience amounts.
        system.details.xp.pct = Math.min(Math.round((system.details.xp.value * 100) / system.details.xp.max), 99.5);

        // PFS Level Bump - check and DC modifiers
        if (system.pfs.levelBump) {
            const params = { slug: "level-bump", label: "PF2E.PFS.LevelBump", modifier: 1 };
            this.synthetics.modifiers.all.push(() => new Modifier(params));
            this.synthetics.modifiers.damage.push(() => new Modifier(params));
        }

        // Calculate HP and SP
        {
            const ancestryHP = system.attributes.ancestryhp;
            const classHP = system.attributes.classhp;
            const hitPoints = system.attributes.hp;
            const modifiers = [new Modifier("PF2E.AncestryHP", ancestryHP, "untyped")];

            if (game.pf2e.settings.variants.stamina) {
                const halfClassHp = Math.floor(classHP / 2);
                system.attributes.hp.sp = {
                    value: system.attributes.hp.sp?.value ?? 0,
                    max: (halfClassHp + system.abilities.con.mod) * this.level,
                };
                system.resources.resolve = {
                    value: system.resources.resolve?.value ?? 0,
                    max: system.abilities[system.details.keyability.value].mod,
                };

                modifiers.push(new Modifier("PF2E.ClassHP", halfClassHp * this.level, "untyped"));
            } else {
                modifiers.push(new Modifier("PF2E.ClassHP", classHP * this.level, "untyped"));
                delete system.resources.resolve;

                // Facilitate level-zero variant play by always adding the constitution modifier at at least level 1
                const conHP = system.abilities.con.mod * Math.max(this.level, 1);
                modifiers.push(
                    new Modifier({
                        slug: "hp-con",
                        label: "PF2E.AbilityCon",
                        ability: "con",
                        type: "ability",
                        modifier: conHP,
                        adjustments: extractModifierAdjustments(
                            synthetics.modifierAdjustments,
                            ["con-based"],
                            "hp-con",
                        ),
                    }),
                );
            }

            const hpRollOptions = this.getRollOptions(["hp"]);
            modifiers.push(...extractModifiers(synthetics, ["hp"], { test: hpRollOptions }));

            const perLevelRollOptions = this.getRollOptions(["hp-per-level"]);
            modifiers.push(
                ...extractModifiers(synthetics, ["hp-per-level"], { test: perLevelRollOptions }).map((clone) => {
                    clone.modifier *= this.level;
                    return clone;
                }),
            );

            const stat = fu.mergeObject(new StatisticModifier("hp", modifiers), hitPoints, { overwrite: false });

            // PFS Level Bump - hit points
            if (system.pfs.levelBump) {
                const hitPointsBump = Math.max(10, Math.floor(stat.totalModifier * 0.1));
                stat.push(new Modifier("PF2E.PFS.LevelBump", hitPointsBump, "untyped"));
            }

            stat.max = stat.totalModifier;
            stat.value = Math.min(stat.value, stat.max); // Make sure the current HP isn't higher than the max HP
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            system.attributes.hp = stat;

            setHitPointsRollOptions(this);
        }

        this.prepareFeats();
        this.prepareSaves();
        this.prepareMartialProficiencies();

        // Perception
        this.perception = new PerceptionStatistic(this, {
            slug: "perception",
            label: "PF2E.PerceptionLabel",
            attribute: "wis",
            rank: system.perception.rank,
            domains: ["perception", "all"],
            check: { type: "perception-check" },
            senses: system.perception.senses,
        });
        system.perception = fu.mergeObject(this.perception.getTraceData(), {
            attribute: this.perception.attribute ?? "wis",
            rank: system.perception.rank,
        });

        // Skills
        this.prepareSkills();

        // Class DC
        this.classDC = null;
        this.classDCs = {};
        for (const [slug, classDC] of Object.entries(system.proficiencies.classDCs)) {
            const statistic = this.prepareClassDC(slug, classDC);
            system.proficiencies.classDCs[slug] = fu.mergeObject(classDC, statistic.getTraceData({ value: "dc" }));
            this.classDCs[slug] = statistic;
            if (classDC.primary) {
                this.classDC = statistic;
            }
        }
        system.attributes.classDC = Object.values(system.proficiencies.classDCs).find((c) => c.primary) ?? null;
        if (system.attributes.classDC) {
            system.attributes.classOrSpellDC = R.pick(system.attributes.classDC, ["rank", "value"]);
        }

        // Armor Class
        const armorStatistic = this.createArmorStatistic();
        this.armorClass = armorStatistic.dc;
        system.attributes.ac = fu.mergeObject(armorStatistic.getTraceData(), {
            attribute: armorStatistic.attribute ?? "dex",
        });

        // Apply the speed penalty from this character's held shield
        const heldShield = this.heldShield;
        if (heldShield?.speedPenalty) {
            const speedPenalty = new Modifier({
                slug: "shield-speed-penalty",
                label: heldShield.name,
                modifier: heldShield.speedPenalty,
            });
            speedPenalty.predicate.push({ not: "self:shield:ignore-speed-penalty" });
            this.synthetics.modifiers.speed ??= [];
            this.synthetics.modifiers.speed.push(() => speedPenalty);
        }

        this.prepareMovementData();

        // Strike actions
        system.actions = this.prepareStrikes();
        this.flags.pf2e.highestWeaponDamageDice = Math.max(
            ...system.actions.filter((s) => s.ready).map((s) => s.item.system.damage.dice),
            0,
        );

        // Initiative
        this.initiative = new ActorInitiative(this, R.pick(system.initiative, ["statistic", "tiebreakPriority"]));
        system.initiative = this.initiative.getTraceData();

        // Resources
        const crafting = system.resources.crafting;
        crafting.infusedReagents.max = Math.floor(crafting.infusedReagents.max) || 0;
        crafting.infusedReagents.value = Math.clamp(crafting.infusedReagents.value, 0, crafting.infusedReagents.max);

        // Set a roll option for whether this character has a familiar
        if (system.attributes.familiarAbilities.value > 0) {
            this.rollOptions.all["self:has-familiar"] = true;
        }
    }

    private prepareBuildData(): void {
        const build = this.system.build;

        if (!build.attributes.manual) {
            for (const section of ["ancestry", "background", "class", 1, 5, 10, 15, 20] as const) {
                // All higher levels are stripped out during data prep
                const boosts = build.attributes.boosts[section];
                if (typeof boosts === "string") {
                    // Class's key ability score
                    const ability = this.system.abilities[boosts];
                    ability.mod += ability.mod >= 4 ? 0.5 : 1;
                } else if (Array.isArray(boosts)) {
                    for (const abbrev of boosts) {
                        const ability = this.system.abilities[abbrev];
                        ability.mod += ability.mod >= 4 ? 0.5 : 1;
                    }
                }

                // Optional and non-optional flaws only come from the ancestry section
                const flaws = section === "ancestry" ? build.attributes.flaws[section] : [];
                for (const abbrev of flaws) {
                    const ability = this.system.abilities[abbrev];
                    ability.mod -= 1;
                }
            }

            // Apply Attribute Apex increase: property already nulled out if ABP is disabled
            const isABP = game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(this);
            if (build.attributes.apex && (!isABP || this.level >= 17)) {
                const attribute = this.system.abilities[build.attributes.apex];
                attribute.mod = Math.max(attribute.mod + 1, 4);
            }
        }

        // Enforce a minimum of -5 for rolled scores and a maximum of 30 for homebrew "mythic" mechanics
        for (const attribute of Object.values(this.system.abilities)) {
            attribute.mod = Math.clamp(attribute.mod, -5, 10);
            // Record base (integer) modifier: same as stored modifier if in manual mode, and prior to RE
            // modifications otherwise. The final prepared modifier is truncated after application of AE-likes.
            attribute.base = Math.trunc(attribute.mod);
        }
    }

    /** Set roll operations for ability scores, proficiency ranks, and number of hands free */
    protected setNumericRollOptions(): void {
        const rollOptionsAll = this.rollOptions.all;

        const perceptionRank = this.system.perception.rank;
        rollOptionsAll[`perception:rank:${perceptionRank}`] = true;

        for (const key of ATTRIBUTE_ABBREVIATIONS) {
            const mod = this.abilities[key].mod;
            rollOptionsAll[`attribute:${key}:mod:${mod}`] = true;
        }

        for (const key of R.keys(CONFIG.PF2E.skills)) {
            const rank = this.system.skills[key].rank;
            rollOptionsAll[`skill:${key}:rank:${rank}`] = true;
        }

        for (const key of R.keys(CONFIG.PF2E.weaponCategories)) {
            const rank = this.system.proficiencies.attacks[key].rank;
            rollOptionsAll[`attack:${key}:rank:${rank}`] = true;
        }

        for (const key of ARMOR_CATEGORIES) {
            const rank = this.system.proficiencies.defenses[key].rank;
            rollOptionsAll[`defense:${key}:rank:${rank}`] = true;
        }

        for (const key of SAVE_TYPES) {
            const rank = this.system.saves[key].rank;
            rollOptionsAll[`save:${key}:rank:${rank}`] = true;
        }

        // Set number of hands free
        const { handsFree, handsReallyFree } = this;
        this.attributes.handsFree = handsFree;
        rollOptionsAll[`hands-free:${handsFree}`] = true;

        // Some rules specify ignoring the Free Hand trait
        rollOptionsAll[`hands-free:but-really:${handsReallyFree}`] = true;
    }

    private createArmorStatistic(): ArmorStatistic {
        const { synthetics, wornArmor } = this;

        // Upgrade light barding proficiency to trained if this PC is somehow an animal
        this.system.proficiencies.defenses["light-barding"].rank ||=
            this.system.traits.value.includes("animal") && !isReallyPC(this)
                ? (Math.max(this.system.proficiencies.defenses["light-barding"].rank, 1) as ZeroToFour)
                : 0;

        const modifiers: Modifier[] = [];
        const dexCapSources: DexterityModifierCapData[] = [
            { value: Infinity, source: "" },
            ...synthetics.dexterityModifierCaps,
        ];

        if (wornArmor) {
            dexCapSources.push({ value: Number(wornArmor.dexCap ?? 0), source: wornArmor.name });
        }

        // DEX modifier is limited by the lowest cap, usually from armor
        const dexCap = dexCapSources.reduce((lowest, candidate) =>
            lowest.value > candidate.value ? candidate : lowest,
        );
        const dexModifier = createAttributeModifier({
            actor: this,
            attribute: "dex",
            domains: ["all", "ac", "dex-based"],
            max: dexCap.value,
        });

        // In case an ability other than DEX is added, find the best ability modifier and use that as the ability on
        // which AC is based
        const attributeModifier = modifiers
            .filter((m) => m.type === "ability" && !!m.ability)
            .reduce((best, modifier) => (modifier.modifier > best.modifier ? modifier : best), dexModifier);
        const attribute = attributeModifier.ability ?? "dex";
        const rank = wornArmor
            ? getItemProficiencyRank(this, wornArmor)
            : this.system.proficiencies.defenses["unarmored"].rank;

        return new ArmorStatistic(this, { rank, attribute, modifiers: [attributeModifier] });
    }

    private prepareSaves(): void {
        const wornArmor = this.wornArmor;

        this.saves = R.mapToObj(SAVE_TYPES, (saveType) => {
            const save = this.system.saves[saveType];
            const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const modifiers: Modifier[] = [];
            const selectors = [saveType, `${save.attribute}-based`, "saving-throw", "all"];

            // Add resilient bonuses for wearing armor with a resilient rune or trait.
            if (wornArmor) {
                const fromTraits = wornArmor.system.traits.config?.resilient ?? 0;
                const fromRunes = wornArmor.isInvested ? wornArmor.system.runes.resilient : 0;
                const resilientModifier = Math.max(fromTraits, fromRunes);
                if (resilientModifier) {
                    const slug = "resilient";
                    const modifierAdjustments = this.synthetics.modifierAdjustments;
                    modifiers.push(
                        new Modifier({
                            slug,
                            type: "item",
                            label: wornArmor.name,
                            modifier: resilientModifier,
                            adjustments: extractModifierAdjustments(modifierAdjustments, selectors, slug),
                        }),
                    );
                }
            }

            const affectedByBulwark = saveType === "reflex" && wornArmor?.traits.has("bulwark");
            if (affectedByBulwark) {
                const slug = "bulwark";
                const bulwarkModifier = new Modifier({
                    slug,
                    type: "untyped",
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
                    test: (options): boolean => new Predicate("damaging-effect").test(options),
                    suppress: true,
                });
            }

            const statistic = new Statistic(this, {
                slug: saveType,
                label: saveName,
                attribute: save.attribute,
                rank: save.rank,
                modifiers,
                domains: selectors,
                check: { type: "saving-throw" },
            });

            this.system.saves[saveType] = fu.mergeObject(this.system.saves[saveType], statistic.getTraceData());

            return [saveType, statistic];
        });
    }

    private prepareSkills() {
        const { synthetics, system, wornArmor } = this;

        this.skills = R.mapToObj(R.entries(CONFIG.PF2E.skills), ([skillSlug, { label, attribute }]) => {
            const skill = system.skills[skillSlug];

            const domains = [skillSlug, `${attribute}-based`, "skill-check", `${attribute}-skill-check`, "all"];
            const modifiers: Modifier[] = [];

            if (skill.armor && typeof wornArmor?.strength === "number" && wornArmor.checkPenalty < 0) {
                const slug = "armor-check-penalty";
                const armorCheckPenalty = new Modifier({
                    slug,
                    label: "PF2E.ArmorCheckPenalty",
                    modifier: wornArmor.checkPenalty,
                    type: "untyped",
                    adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, domains, slug),
                });

                // Set requirements for ignoring the check penalty according to skill
                armorCheckPenalty.predicate.push({ nor: ["attack", "armor:ignore-check-penalty"] });
                if (["acrobatics", "athletics"].includes(skillSlug)) {
                    armorCheckPenalty.predicate.push({
                        nor: ["armor:strength-requirement-met", "armor:trait:flexible"],
                    });
                } else if (skillSlug === "stealth" && wornArmor.traits.has("noisy")) {
                    armorCheckPenalty.predicate.push({
                        nand: ["armor:strength-requirement-met", "armor:ignore-noisy-penalty"],
                    });
                } else {
                    armorCheckPenalty.predicate.push({ not: "armor:strength-requirement-met" });
                }

                modifiers.push(armorCheckPenalty);
            }

            // Add a penalty for attempting to Force Open without a crowbar or similar tool
            if (skillSlug === "athletics") modifiers.push(createForceOpenPenalty(this, domains));

            const statistic = new Statistic(this, {
                slug: skillSlug,
                label,
                rank: skill.rank,
                attribute,
                domains,
                modifiers,
                lore: false,
                check: { type: "skill-check" },
            }) as CharacterSkill<this>;

            return [skillSlug, statistic];
        });

        // Assemble lore items, key'd by a normalized slug
        const loreItems = R.mapToObj(this.itemTypes.lore, (loreItem) => [loreItem.slug, loreItem]);

        // Add Lore skills to skill statistics
        for (const [slug, loreItem] of Object.entries(loreItems)) {
            const rank = loreItem.system.proficient.value;
            this.skills[slug as SkillSlug] = new Statistic(this, {
                slug,
                label: loreItem.name,
                rank,
                attribute: "int",
                domains: [slug, "skill-check", "lore-skill-check", "int-skill-check", "all"],
                lore: true,
                check: { type: "skill-check" },
            }) as CharacterSkill<this>;
        }

        // Create trace skill data in system data and omit unprepared skills
        this.system.skills = R.mapToObj(Object.entries(this.skills), ([key, statistic]) => {
            const loreItem = statistic.lore ? loreItems[statistic.slug] : null;
            const baseData = this.system.skills[key] ?? {};
            const data: CharacterSkillData = fu.mergeObject(baseData, {
                ...statistic.getTraceData(),
                rank: statistic.rank,
                armor: baseData.armor ?? false,
                itemId: loreItem?.id ?? null,
                lore: !!statistic.lore,
            });
            return [key, data];
        });
    }

    override prepareMovementData(): void {
        const wornArmor = this.wornArmor;
        const basePenalty = wornArmor?.speedPenalty ?? 0;
        const strength = this.system.abilities.str.mod;
        const requirement = wornArmor?.strength ?? null;
        const penaltyValue = Math.min(
            typeof requirement === "number" && strength >= requirement ? Math.min(basePenalty + 5, 0) : basePenalty,
            0,
        );
        const slug = "armor-speed-penalty";
        const armorPenalty = penaltyValue
            ? new Modifier({
                  slug,
                  label: wornArmor?.name ?? "PF2E.ArmorSpeedLabel",
                  modifier: penaltyValue,
                  type: "untyped",
                  predicate: new Predicate({ nor: ["derived-from-land", "armor:ignore-speed-penalty"] }),
              })
            : null;
        // A hindering penalty can't be removed or mitigated
        const hinderingPenalty = createHinderingPenalty(this);
        super.prepareMovementData([armorPenalty, hinderingPenalty].filter(R.isNonNull));
    }

    private prepareFeats(): void {
        this.pfsBoons = [];
        this.divineIntercessions = [];
        this.feats = new CharacterFeats(this);

        for (const section of game.pf2e.settings.campaign.feats.sections) {
            this.feats.createGroup(section);
        }

        this.feats.assignToSlots();

        // These are not handled by character feats
        const feats = this.itemTypes.feat
            .filter((f) => ["pfsboon", "deityboon", "curse"].includes(f.category))
            .sort((f1, f2) => f1.sort - f2.sort);
        for (const feat of feats) {
            if (feat.category === "pfsboon") {
                this.pfsBoons.push(feat);
            } else {
                this.divineIntercessions.push(feat);
            }
        }
    }

    private prepareClassDC(
        slug: string,
        classDC: Pick<ClassDCData, "label" | "attribute" | "rank" | "primary">,
    ): Statistic {
        /** @todo migrate to attribute */
        if ("ability" in classDC && setHasElement(ATTRIBUTE_ABBREVIATIONS, classDC.ability)) {
            classDC.attribute = classDC.ability;
        }
        classDC.attribute ??= "str";
        classDC.rank ??= 0;
        classDC.primary ??= false;

        const classNames: Record<string, string | undefined> = CONFIG.PF2E.classTraits;
        classDC.label = classDC.label ?? classNames[slug] ?? slug.titleCase();

        return new Statistic(this, {
            slug,
            label: classDC.label,
            attribute: classDC.attribute,
            rank: classDC.rank,
            domains: ["class", slug, "all"],
            check: { type: "check" },
        });
    }

    /** Prepare this character's strike actions */
    prepareStrikes({ includeBasicUnarmed = true } = {}): CharacterStrike[] {
        const { itemTypes, synthetics } = this;

        // Acquire the character's handwraps of mighty blows and apply its runes to all unarmed attacks
        const handwraps = itemTypes.weapon.find(
            (w) =>
                w.system.traits.otherTags.includes("handwraps-of-mighty-blows") &&
                w.category === "unarmed" &&
                w.isEquipped &&
                w.isInvested,
        );
        const unarmedRunes = fu.deepClone(handwraps?._source.system.runes) ?? { potency: 0, striking: 0, property: [] };

        // Add a basic unarmed strike
        const basicUnarmed = includeBasicUnarmed
            ? ((): WeaponPF2e<this> => {
                  const source: PreCreate<WeaponSource> = {
                      _id: "xxPF2ExUNARMEDxx",
                      name: game.i18n.localize("PF2E.WeaponTypeUnarmed"),
                      type: "weapon",
                      img: "icons/skills/melee/unarmed-punch-fist.webp",
                      system: {
                          slug: "basic-unarmed",
                          category: "unarmed",
                          baseItem: null,
                          bonus: { value: 0 },
                          damage: { dice: 1, die: "d4", damageType: "bludgeoning" } as const,
                          equipped: {
                              carryType: "worn",
                              inSlot: true,
                              handsHeld: 0,
                          },
                          group: "brawling",
                          traits: { value: ["agile", "finesse", "nonlethal", "unarmed"] },
                          usage: { value: "worngloves" },
                          runes: unarmedRunes,
                      },
                  };

                  // No handwraps, so generate straight from source
                  const attack = new WeaponPF2e(source, { parent: this });
                  for (const rule of this.synthetics.itemAlterations) {
                      rule.applyAlteration({ singleItem: attack });
                  }
                  return attack;
              })()
            : null;

        const ammos = [
            ...itemTypes.consumable.filter((i) => i.category === "ammo" && !i.isStowed),
            ...itemTypes.weapon.filter((w) => w.system.usage.canBeAmmo),
        ];
        const offensiveCategories = R.keys(CONFIG.PF2E.weaponCategories);
        const syntheticWeapons = Object.values(synthetics.strikes)
            .map((s) => s(unarmedRunes))
            .filter(R.isNonNull);
        // Exclude handwraps as a strike
        const weapons = [
            itemTypes.weapon.filter((w) => !w.system.traits.otherTags.includes("handwraps-of-mighty-blows")),
            syntheticWeapons,
            basicUnarmed ?? [],
            // Generate a shield attacks from the character's shields
            this.itemTypes.shield
                .filter((s) => !s.isStowed && !s.isBroken && !s.isDestroyed)
                .map((s) => s.generateWeapon()),
            this.inventory.flatMap((i) =>
                i.isEquipped ? i.subitems.filter((i): i is WeaponPF2e<this> => i.isOfType("weapon")) : [],
            ),
        ]
            .flat()
            .filter(R.isTruthy) as WeaponPF2e<this>[];

        // Sort alphabetically, force basic unarmed attack to end, move all held items to the beginning, and then move
        // all readied strikes to beginning
        const handsReallyFree = this.handsReallyFree;
        const strikes = weapons
            .map((w) => this.prepareStrike(w, { categories: offensiveCategories, handsReallyFree, ammos }))
            .sort((a, b) =>
                a.label
                    .toLocaleLowerCase(game.i18n.lang)
                    .replace(/[-0-9\s]/g, "")
                    .localeCompare(b.label.toLocaleLowerCase(game.i18n.lang).replace(/[-0-9\s]/gi, ""), game.i18n.lang),
            )
            .sort((a, b) => (a.slug === "basic-unarmed" ? 1 : b.slug === "basic-unarmed" ? -1 : 0))
            .sort((a, b) => (a.item.isHeld === b.item.isHeld ? 0 : a.item.isHeld ? -1 : 1))
            .sort((a, b) => (a.ready === b.ready ? 0 : a.ready ? -1 : 1));

        // Finally, position subitem weapons directly below their parents
        for (const subitemStrike of strikes.filter((s) => s.item.parentItem)) {
            const subitem = subitemStrike.item;
            const parentStrike = strikes.find((s) => (s.item.shield ?? s.item) === subitem.parentItem);
            if (parentStrike) {
                strikes.splice(strikes.indexOf(subitemStrike), 1);
                strikes.splice(strikes.indexOf(parentStrike) + 1, 0, subitemStrike);
            }
        }

        return strikes;
    }

    /** Prepare a strike action from a weapon */
    private prepareStrike(
        weapon: WeaponPF2e<CharacterPF2e>,
        { categories, handsReallyFree, ammos = [] }: PrepareStrikeOptions,
    ): CharacterStrike {
        const synthetics = this.synthetics;
        const modifiers: Modifier[] = [];

        // Apply strike adjustments affecting the weapon
        const strikeAdjustments = [
            synthetics.strikeAdjustments,
            getPropertyRuneStrikeAdjustments(weapon.system.runes.property),
        ].flat();
        for (const adjustment of strikeAdjustments) {
            adjustment.adjustWeapon?.(weapon);
        }
        // Process again (first done during weapon data preparation) in case of late-arriving strike adjustment
        processTwoHandTrait(weapon);
        const weaponTraits = weapon.system.traits.value;
        const weaponRollOptions = new Set(weapon.getRollOptions("item"));
        const proficiencyRank = getItemProficiencyRank(this, weapon, weaponRollOptions);
        const meleeOrRanged = weapon.isMelee ? "melee" : "ranged";
        const baseOptions = [
            "action:strike",
            "self:action:slug:strike",
            `item:proficiency:rank:${proficiencyRank}`,
            // @todo migrate away:
            PROFICIENCY_RANK_OPTION[proficiencyRank],
            ...weaponTraits, // @todo same
            meleeOrRanged,
        ];

        const attackDomains = getStrikeAttackDomains(weapon, proficiencyRank, baseOptions);

        // Determine the default ability and score for this attack.
        const defaultAttribute = weapon.defaultAttribute;
        modifiers.push(createAttributeModifier({ actor: this, attribute: defaultAttribute, domains: attackDomains }));
        if (weapon.isMelee && weaponTraits.includes("finesse")) {
            modifiers.push(createAttributeModifier({ actor: this, attribute: "dex", domains: attackDomains }));
        }
        if (weapon.isRanged && weaponTraits.includes("brutal")) {
            modifiers.push(createAttributeModifier({ actor: this, attribute: "str", domains: attackDomains }));
        }

        modifiers.push(createProficiencyModifier({ actor: this, rank: proficiencyRank, domains: attackDomains }));

        // Roll options used only in the initial stage of building the strike action
        const initialRollOptions = new Set([
            ...baseOptions,
            ...this.getRollOptions(attackDomains),
            ...weaponRollOptions,
        ]);

        // Extract weapon roll notes
        const ABP = game.pf2e.variantRules.AutomaticBonusProgression;

        if (weapon.group === "bomb" && !ABP.isEnabled(this)) {
            const attackBonus = Number(weapon.system.bonus?.value) || 0;
            if (attackBonus !== 0) {
                modifiers.push(new Modifier("PF2E.ItemBonusLabel", attackBonus, "item"));
            }
        }

        // Handle item or potency bonus to attack rolls
        {
            const grade = weapon.system.grade;
            const potencyRune = weapon.system.runes.potency;
            const trackingMod = weapon.system.traits.config.tracking || 0;

            // Get all weapon potency synthetics. These don't work for sf2e unless the type is potency (ABP)
            const potencySynthetics = attackDomains
                .flatMap((key) => fu.deepClone(synthetics.weaponPotency[key] ?? []))
                .filter((wp) => wp.predicate.test(initialRollOptions) && (!grade || wp.type === "potency"));
            const bestSynthetic = potencySynthetics.length
                ? potencySynthetics.reduce((highest, current) => (highest.bonus > current.bonus ? highest : current))
                : null;

            // Calculate the best choice between rune/tracking/synthetics. Potency synthetics add the magical trait.
            // The potency rune already adds the magical trait during data preparation.
            type BonusSource = { slug: string; label: string; type: ModifierType; modifier: number; magical?: boolean };
            const sources: BonusSource[] = [
                { slug: "weapon-potency", label: "PF2E.Item.Weapon.Rune.Potency", type: "item", modifier: potencyRune },
                { slug: "tracking", label: "PF2E.Item.Weapon.Tracking", type: "item", modifier: trackingMod },
            ];
            if (bestSynthetic) {
                sources.push({
                    slug: bestSynthetic.type === "item" ? "weapon-potency" : "attack-potency",
                    label: bestSynthetic.label,
                    type: bestSynthetic.type,
                    modifier: bestSynthetic.bonus,
                    magical: true,
                });
            }
            const best = sources.reduce((result, current) => (result.modifier >= current.modifier ? result : current));

            if (best.modifier > 0) {
                const { slug, type } = best;
                modifiers.push(
                    new Modifier({
                        ...R.pick(best, ["slug", "type", "label", "modifier"]),
                        adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, attackDomains, slug),
                    }),
                );

                // In case of a WeaponPotency RE, add traits to establish the weapon as being magical
                if (!weapon.isMagical && best.magical && (type === "item" || !ABP.isEnabled(weapon.actor))) {
                    weapon.system.traits.value.push("magical");
                }

                weapon.flags.pf2e.attackItemBonus = best.modifier;
            }
        }

        const shoddyPenalty = createShoddyPenalty(this, weapon, attackDomains);
        if (shoddyPenalty) modifiers.push(shoddyPenalty);

        // Everything from relevant synthetics
        modifiers.push(
            ...PCAttackTraitHelpers.createAttackModifiers({ item: weapon, domains: attackDomains }),
            ...extractModifiers(synthetics, attackDomains, { injectables: { weapon }, resolvables: { weapon } }),
        );

        const auxiliaryActions: WeaponAuxiliaryAction[] = [];
        const isRealItem = this.items.has(weapon.id);
        const traitsArray = weapon.system.traits.value;

        if (weapon.system.traits.toggles.modular.options.length > 0) {
            auxiliaryActions.push(new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "modular" }));
        }
        if (weapon.isEquipped) {
            if (traitsArray.includes("parry") && !this.rollOptions.all["self:effect:parry"]) {
                auxiliaryActions.push(new WeaponAuxiliaryAction({ weapon, action: "parry" }));
            }
        }
        if (isRealItem && weapon.category !== "unarmed" && !weapon.parentItem) {
            const usage = weapon.system.usage;
            const weaponAsShield = weapon.shield;
            const canWield2H =
                usage.hands === 2 ||
                (usage.hands === 1 && this.handsFree > 0 && !!weaponAsShield) ||
                traitsArray.some((t) => t.startsWith("fatal-aim")) ||
                traitsArray.some((t) => t.startsWith("two-hand"));

            switch (weapon.carryType) {
                case "held": {
                    if (weaponAsShield) {
                        const hasShieldRaised = !!this.rollOptions.all["self:effect:raise-a-shield"];
                        const hasGreaterCover = !!this.rollOptions.all["self:cover-level:greater"];
                        if (!hasShieldRaised) {
                            auxiliaryActions.push(new WeaponAuxiliaryAction({ weapon, action: "raise-a-shield" }));
                        } else if (weaponAsShield.isTowerShield && weaponAsShield.isRaised) {
                            const action = hasGreaterCover ? "end-cover" : "take-cover";
                            const annotation = "tower-shield";
                            auxiliaryActions.push(new WeaponAuxiliaryAction({ weapon, action, annotation }));
                        }
                    }

                    if (weapon.handsHeld === 2) {
                        auxiliaryActions.push(
                            new WeaponAuxiliaryAction({ weapon, action: "release", annotation: "grip", hands: 1 }),
                        );
                    } else if (weapon.handsHeld === 1 && canWield2H) {
                        auxiliaryActions.push(
                            new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "grip", hands: 2 }),
                        );
                    }
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "sheathe", hands: 0 }),
                    );
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "release", annotation: "drop", hands: 0 }),
                    );

                    break;
                }
                case "worn": {
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "draw", hands: 1 }),
                    );
                    if (canWield2H) {
                        auxiliaryActions.push(
                            new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "draw", hands: 2 }),
                        );
                    }
                    break;
                }
                case "stowed": {
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "retrieve", hands: 1 }),
                    );
                    break;
                }
                case "dropped": {
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "pick-up", hands: 1 }),
                    );
                    if (canWield2H) {
                        auxiliaryActions.push(
                            new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "pick-up", hands: 2 }),
                        );
                    }
                    break;
                }
            }
        }

        const weaponSlug = weapon.slug ?? sluggify(weapon.name);
        const flavor = this.getStrikeDescription(weapon);
        const rollOptions = [
            ...this.getRollOptions(attackDomains),
            ...weaponRollOptions,
            ...weaponTraits,
            meleeOrRanged,
        ];
        const strikeStat = new StatisticModifier(weaponSlug, modifiers, rollOptions);
        const altUsages = weapon.getAltUsages().map((w) => this.prepareStrike(w, { categories, handsReallyFree }));
        const versatileLabel = (damageType: DamageType): string => {
            switch (damageType) {
                case "bludgeoning":
                    return CONFIG.PF2E.weaponTraits["versatile-b"];
                case "piercing":
                    return CONFIG.PF2E.weaponTraits["versatile-p"];
                case "slashing":
                    return CONFIG.PF2E.weaponTraits["versatile-s"];
                default: {
                    const traitsConfig: Record<string, string | undefined> = CONFIG.PF2E.weaponTraits;
                    return traitsConfig[`versatile-${damageType}`] ?? CONFIG.PF2E.damageTypes[damageType];
                }
            }
        };

        const handsAvailable = !weapon.system.graspingAppendage || handsReallyFree > 0;

        const actionTraits: AbilityTrait[] = [
            "attack" as const,
            // CRB p. 544: "Due to the complexity involved in preparing bombs, Strikes to throw alchemical bombs gain
            // the manipulate trait."
            weapon.baseType === "alchemical-bomb" ? ("manipulate" as const) : [],
        ].flat();
        for (const adjustment of strikeAdjustments) {
            adjustment.adjustTraits?.(weapon, actionTraits);
        }

        const ready =
            (weapon.isEquipped && handsAvailable) ||
            (weapon.isThrown && weapon.reload === "0" && weapon.isWorn && handsReallyFree > 0);

        const traitToggles = weapon.system.traits.toggles;
        const doubleBarrel = weaponTraits.includes("double-barrel") ? traitToggles.doubleBarrel : null;
        const versatileOptions =
            weapon.altUsageType === "thrown"
                ? []
                : traitToggles.versatile.options.map((o) => ({
                      value: o,
                      selected: traitToggles.versatile.selected === o,
                      label: versatileLabel(o),
                      glyph: DAMAGE_TYPE_ICONS[o],
                  }));

        const hiddenCauseStowed = weapon.isStowed && this.flags.pf2e.hideStowed;
        const hiddenCauseUnarmed = weapon.slug === "basic-unarmed" && !this.flags.pf2e.showBasicUnarmed;
        const action: CharacterStrike = fu.mergeObject(strikeStat, {
            label: weapon.name,
            quantity: weapon.quantity,
            ready,
            domains: attackDomains,
            visible: !(hiddenCauseStowed || hiddenCauseUnarmed),
            glyph: "A",
            item: weapon,
            type: "strike" as const,
            ...flavor,
            options: Array.from(baseOptions),
            traits: actionTraits.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits)),
            handsAvailable,
            weaponTraits: weaponTraits
                .map((t) => traitSlugToObject(t, CONFIG.PF2E.npcAttackTraits))
                .sort((a, b) => a.label.localeCompare(b.label)),
            variants: [],
            selectedAmmoId: weapon.system.selectedAmmoId,
            canStrike: true,
            altUsages,
            auxiliaryActions,
            doubleBarrel,
            versatileOptions,
        });

        if (action.versatileOptions.length > 0) {
            action.versatileOptions.unshift({
                value: weapon.system.damage.damageType,
                selected: traitToggles.versatile.selected === null,
                label: CONFIG.PF2E.damageTypes[weapon.system.damage.damageType],
                glyph: DAMAGE_TYPE_ICONS[weapon.system.damage.damageType],
            });
        }

        // Show the ammo list if the weapon requires ammo
        if (weapon.system.expend) {
            const compatible = ammos
                .filter((a) => a.isAmmoFor(weapon))
                .map((a) => ({ id: a.id, label: `${a.name} (${a.quantity})` }));
            const incompatible = ammos
                .filter((a) => !a.isAmmoFor(weapon))
                .map((a) => ({ id: a.id, label: `${a.name} (${a.quantity})` }));
            const ammo = weapon.ammo;
            const selected = ammo ? { id: ammo.id, compatible: ammo.isAmmoFor(weapon) } : null;
            action.ammunition = { compatible, incompatible, selected };
        }

        action.breakdown = action.modifiers
            .filter((m) => m.enabled)
            .map((m) => `${m.label} ${m.signedValue}`)
            .join(", ");

        // Multiple attack penalty
        const createMAPenalty = (data: MultipleAttackPenaltyData, increases: ZeroToTwo) => {
            if (increases === 0) return null;
            const penalty = new Modifier({
                slug: data.slug,
                label: data.label,
                modifier: data[`map${increases}`],
                adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, attackDomains, data.slug),
            });
            return penalty;
        };
        const initialMAPs = calculateMAPs(weapon, { domains: attackDomains, options: initialRollOptions });

        const checkModifiers = [
            (statistic: StrikeData, otherModifiers: Modifier[]) =>
                new CheckModifier("strike", statistic, otherModifiers),
            (statistic: StrikeData, otherModifiers: Modifier[]) =>
                new CheckModifier("strike-map1", statistic, otherModifiers),
            (statistic: StrikeData, otherModifiers: Modifier[]) =>
                new CheckModifier("strike-map2", statistic, otherModifiers),
        ];

        action.variants = ([0, 1, 2] as const).map((mapIncreases) => ({
            get label(): string {
                const penalty = createMAPenalty(initialMAPs, mapIncreases);
                adjustModifiers([penalty].filter(R.isTruthy), initialRollOptions);

                return penalty
                    ? game.i18n.format("PF2E.MAPAbbreviationValueLabel", {
                          value: signedInteger(action.totalModifier + penalty.value),
                          penalty: penalty.value,
                      })
                    : signedInteger(action.totalModifier);
            },
            roll: async (params: AttackRollParams = {}): Promise<Rolled<CheckRoll> | null> => {
                params.options ??= [];

                const expend = weapon.system.expend ?? 0;
                const configuredAmmo = weapon.ammo;
                const ammoRemaining = configuredAmmo?.isOfType("consumable")
                    ? configuredAmmo.uses.max > 1
                        ? configuredAmmo.uses.value
                        : configuredAmmo.quantity
                    : (configuredAmmo?.quantity ?? 0);
                params.consumeAmmo ??= expend > 0;

                if (params.consumeAmmo && expend > ammoRemaining) {
                    ui.notifications.warn(
                        game.i18n.format("PF2E.Strike.Ranged.NoAmmo", { weapon: weapon.name, actor: this.name }),
                    );
                    return null;
                }
                const targetToken = params.getFormula
                    ? null
                    : ((params.target ?? game.user.targets.first())?.document ?? null);

                const context = await new CheckContext({
                    domains: attackDomains,
                    origin: { actor: this, statistic: action, item: weapon },
                    target: { token: targetToken },
                    against: "armor",
                    options: new Set([...baseOptions, ...params.options]),
                    viewOnly: params.getFormula,
                    traits: actionTraits,
                }).resolve();
                action.traits = context.traits.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits));
                if (!context.origin) return null;

                const statistic = context.origin.statistic ?? action;
                const maps = calculateMAPs(context.origin.item, { domains: context.domains, options: context.options });
                const maPenalty = createMAPenalty(maps, mapIncreases);
                const allModifiers = [maPenalty, params.modifiers, context.origin.modifiers].flat().filter(R.isTruthy);
                const check = checkModifiers[mapIncreases](statistic, allModifiers);

                // Check whether target is out of maximum range; abort early if so
                if (context.origin.item.isRanged && typeof context.target?.distance === "number") {
                    const maxRange = context.origin.item.range?.max ?? 10;
                    if (context.target.distance > maxRange) {
                        ui.notifications.warn("PF2E.Action.Strike.OutOfRange", { localize: true });
                        return null;
                    }
                }

                // Get just-in-time roll options from rule elements
                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    rule.beforeRoll?.(context.domains, context.options);
                }

                const dc = params.dc ?? context.dc;

                const notes = extractNotes(context.origin.actor.synthetics.rollNotes, context.domains);
                const rollTwice =
                    params.rollTwice ||
                    extractRollTwice(context.origin.actor.synthetics.rollTwice, context.domains, context.options);
                const substitutions = extractRollSubstitutions(
                    context.origin.actor.synthetics.rollSubstitutions,
                    context.domains,
                    context.options,
                );
                const dosAdjustments = [
                    getPropertyRuneDegreeAdjustments(context.origin.item),
                    extractDegreeOfSuccessAdjustments(context.origin.actor.synthetics, context.domains),
                ].flat();

                const title = game.i18n.format(
                    weapon.isMelee ? "PF2E.Action.Strike.MeleeLabel" : "PF2E.Action.Strike.RangedLabel",
                    { weapon: weapon.name },
                );

                const checkContext: CheckCheckContext = {
                    type: "attack-roll",
                    identifier: `${weapon.id}.${weaponSlug}.${meleeOrRanged}`,
                    action: "strike",
                    title,
                    actor: context.origin.actor,
                    token: context.origin.token,
                    origin: context.origin,
                    target: context.target,
                    item: context.origin.item,
                    altUsage: params.altUsage ?? null,
                    damaging: context.origin.item.dealsDamage,
                    domains: context.domains,
                    options: context.options,
                    notes,
                    dc,
                    traits: context.traits,
                    rollTwice,
                    substitutions,
                    dosAdjustments,
                    mapIncreases: mapIncreases as ZeroToTwo,
                    createMessage: params.createMessage ?? true,
                };

                // consumeAmmo will add/wrap the callback to do the actual consumption of ammo at the end
                if (params.consumeAmmo && !this.consumeAmmo(context.origin.item, params)) {
                    return null;
                }

                const roll = await Check.roll(check, checkContext, params.event, params.callback);
                if (roll) {
                    for (const rule of context.origin.actor.rules.filter((r) => !r.ignored)) {
                        await rule.afterRoll?.({
                            roll,
                            check,
                            context: checkContext,
                            domains: context.domains,
                            rollOptions: context.options,
                        });
                    }
                }

                return roll;
            },
        }));
        action.attack = action.roll = action.variants[0].roll;

        for (const method of ["damage", "critical"] as const) {
            action[method] = async (params: DamageRollParams = {}): Promise<string | Rolled<DamageRoll> | null> => {
                params.options = new Set(params.options ?? []);
                const targetToken = params.target ?? game.user.targets.first() ?? null;

                const context = await new DamageContext({
                    viewOnly: params.getFormula ?? false,
                    origin: { actor: this, statistic: action, item: weapon },
                    target: { token: targetToken?.document },
                    domains: getStrikeDamageDomains(weapon, proficiencyRank),
                    outcome: method === "damage" ? "success" : "criticalSuccess",
                    options: new Set([...baseOptions, ...params.options]),
                    traits: actionTraits,
                    checkContext: params.checkContext,
                }).resolve();
                if (!context.origin) return null;

                const weaponClone = context.origin.item;
                if (!weaponClone?.isOfType("weapon")) {
                    throw Error();
                }

                if (!weaponClone.dealsDamage) {
                    if (!params.getFormula) {
                        ui.notifications.warn("PF2E.ErrorMessage.WeaponNoDamage", { localize: true });
                        return null;
                    }
                    return "";
                }

                const outcome = method === "damage" ? "success" : "criticalSuccess";
                const { origin, target, options } = context;
                const damageContext: DamageDamageContext = {
                    type: "damage-roll",
                    sourceType: "attack",
                    self: origin,
                    target,
                    outcome,
                    options,
                    domains: context.domains,
                    traits: context.traits,
                    createMessage: params.createMessage ?? true,
                    ...eventToRollParams(params.event, { type: "damage" }),
                };

                // Include MAP increases in case any ability depends on it
                if (typeof params.mapIncreases === "number") {
                    damageContext.mapIncreases = params.mapIncreases;
                    damageContext.options.add(`map:increases:${params.mapIncreases}`);
                }

                if (params.getFormula) damageContext.skipDialog = true;

                const damage = await WeaponDamagePF2e.calculate({
                    weapon: weaponClone,
                    actor: context.origin.actor,
                    weaponPotency: weapon.flags.pf2e.attackItemBonus,
                    context: damageContext,
                });
                if (!damage) return null;

                if (params.getFormula) {
                    const formula = damage.damage.formula[outcome];
                    return formula ? new DamageRoll(formula).formula : "";
                } else {
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

    consumeAmmo(weapon: WeaponPF2e<CharacterPF2e>, params: RollParameters): boolean {
        const ammo = weapon.ammo;
        if (!ammo) {
            return true;
        } else if (ammo.quantity < 1) {
            ui.notifications.warn(game.i18n.localize("PF2E.ErrorMessage.NotEnoughAmmo"));
            return false;
        } else {
            const existingCallback = params.callback;
            params.callback = async (...args) => {
                await existingCallback?.(...args);
                await weapon.consumeAmmo();
            };
            return true;
        }
    }

    /** Prepare stored and synthetic martial proficiencies */
    prepareMartialProficiencies(): void {
        for (const key of ["attacks", "defenses"] as const) {
            const proficiencies = this.system.proficiencies[key];
            // Set ranks of linked proficiencies to their respective categories
            type LinkedProficiency = MartialProficiency & { sameAs: string };
            const linkedProficiencies = Object.values(proficiencies).filter(
                (p): p is LinkedProficiency => !!p?.sameAs && p.sameAs in proficiencies,
            );
            for (const proficiency of linkedProficiencies) {
                const category = proficiencies[proficiency.sameAs ?? ""];
                const maxRankIndex = PROFICIENCY_RANKS.indexOf(proficiency.maxRank ?? "legendary");
                proficiency.rank = Math.min(category?.rank ?? 0, maxRankIndex) as ZeroToFour;
            }

            // Deduplicate proficiencies, set proficiency bonuses to all
            const allProficiencies = Object.entries(proficiencies);
            for (const [_key, proficiency] of allProficiencies) {
                if (!proficiency) continue;
                const duplicates = allProficiencies.flatMap(([k, p]) =>
                    p &&
                    proficiency !== p &&
                    proficiency.rank >= p.rank &&
                    "definition" in proficiency &&
                    "definition" in p &&
                    proficiency.sameAs === p.sameAs &&
                    R.isDeepEqual(p.definition ?? [], proficiency.definition ?? [])
                        ? k
                        : [],
                );
                for (const duplicate of duplicates) {
                    delete proficiencies[duplicate];
                }

                const proficiencyBonus = createProficiencyModifier({
                    actor: this,
                    rank: proficiency.rank,
                    domains: [],
                });
                proficiency.value = proficiencyBonus.value;
                proficiency.breakdown = `${proficiencyBonus.label} ${proficiencyBonus.signedValue}`;
            }
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
            const newCarryType = item.system.usage.type === "carried" ? "worn" : item.system.usage.type;
            await this.changeCarryType(item, {
                carryType: newCarryType,
                handsHeld: item.system.usage.hands,
                inSlot: true,
            });
        }

        return !!(await item.update({ "system.equipped.invested": !invested }));
    }

    /** Add a proficiency in a weapon group or base weapon */
    async addAttackProficiency(key: BaseWeaponProficiencyKey | WeaponGroupProficiencyKey): Promise<void> {
        const currentProficiencies = this.system.proficiencies.attacks;
        if (key in currentProficiencies) return;
        const newProficiency: Partial<MartialProficiency> = { rank: 1, custom: true };
        await this.update({ [`system.proficiencies.attacks.${key}`]: newProficiency });
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: CreatureUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        const isFullReplace = !((options.diff ?? true) && (options.recursive ?? true));
        if (isFullReplace) return super._preUpdate(changed, options, user);

        // Allow only one free crafting and quick alchemy to be enabled
        if (changed.flags?.pf2e?.freeCrafting) {
            changed.flags.pf2e.quickAlchemy = false;
        } else if (changed.flags?.pf2e?.quickAlchemy) {
            changed.flags.pf2e.freeCrafting = false;
        }

        if (!changed.system) return super._preUpdate(changed, options, user);

        // Clamp level, allowing for level-0 variant rule and enough room for homebrew "mythical" campaigns
        const attributeChanged =
            !!changed.system.build?.attributes &&
            !R.isEmpty(fu.diffObject(this._source.system.build?.attributes ?? {}, changed.system.build.attributes));

        const levelData = changed.system.details?.level;
        if (levelData?.value !== undefined) {
            if (!Number.isInteger(levelData.value)) levelData.value = 1;
            levelData.value = Math.clamp(levelData.value, 0, 30);
        }
        const newLevel = levelData?.value ?? this.level;

        if (newLevel !== this.level || attributeChanged) {
            // Adjust hit points if level is changing
            const clone = this.clone(changed);
            const hpMaxDifference = clone.hitPoints.max - this.hitPoints.max;
            if (hpMaxDifference !== 0) {
                options.allowHPOverage = true;
                const currentHP = this.hitPoints.value;
                const newHP = Math.max(
                    currentHP + hpMaxDifference,
                    currentHP === 0 ? 0 : 1, // Refrain from killing the character merely by lowering level
                );
                changed.system = fu.mergeObject(changed.system, { attributes: { hp: { value: newHP } } });
            }
        }

        // Clamp infused reagents
        if (changed.system.resources?.crafting?.infusedReagents?.value !== undefined) {
            const infusedReagents = changed.system.resources.crafting.infusedReagents;
            const max = Math.max(0, this.system.resources.crafting.infusedReagents.max || 0);
            infusedReagents.value = Math.clamp(Math.floor(infusedReagents.value || 0), 0, max);
        }

        // Clamp Stamina and Resolve
        if (game.pf2e.settings.variants.stamina) {
            // Do not allow stamina to go over max
            if (changed.system.attributes?.hp?.sp) {
                changed.system.attributes.hp.sp.value =
                    Math.floor(
                        Math.clamp(
                            changed.system.attributes.hp.sp?.value ?? 0,
                            0,
                            this.system.attributes.hp.sp?.max ?? 0,
                        ),
                    ) || 0;
            }

            // Do not allow resolve to go over max
            if (changed.system.resources?.resolve) {
                changed.system.resources.resolve.value =
                    Math.floor(
                        Math.clamp(
                            changed.system.resources.resolve.value ?? 0,
                            0,
                            this.system.resources.resolve?.max ?? 0,
                        ),
                    ) || 0;
            }
        }

        // Ensure minimum XP value and max
        const xp = changed.system.details?.xp ?? {};
        if (typeof xp.value === "number") xp.value = Math.max(xp.value, 0);
        if (typeof xp.max === "number") xp.max = Math.max(xp.max, 1);

        // Add or remove class features as necessary, appropriate to the PC's level
        const actorClass = this.class;
        if (actorClass && newLevel !== this.level) {
            const current = this.itemTypes.feat.filter((feat) => feat.category === "classfeature");
            if (newLevel > this.level) {
                const classFeaturesToCreate = (await actorClass.createGrantedItems({ level: newLevel }))
                    .filter(
                        (feature) =>
                            feature.system.level.value > this.level &&
                            !current.some((cf) => cf.sourceId === feature.sourceId),
                    )
                    .map((i) => i.toObject());
                await this.createEmbeddedDocuments("Item", classFeaturesToCreate, { keepId: true, render: false });
            } else if (newLevel < this.level) {
                const classFeaturestoDelete = current
                    .filter((f) => f.level > newLevel && !f.grantedBy)
                    .map((f) => f.id);
                await this.deleteEmbeddedDocuments("Item", classFeaturestoDelete, { render: false });
            }
        }

        // Constrain PFS player and character numbers
        for (const property of ["playerNumber", "characterNumber"] as const) {
            if (typeof changed.system.pfs?.[property] === "number") {
                const [min, max] = property === "playerNumber" ? [1, 9_999_999] : [2001, 9999];
                changed.system.pfs[property] = Math.clamp(changed.system.pfs[property] || 0, min, max);
            } else if (changed.system.pfs && changed.system.pfs[property] !== null) {
                changed.system.pfs[property] = this.system.pfs[property] ?? null;
            }
        }

        return super._preUpdate(changed, options, user);
    }
}

interface CharacterPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null>
    extends CreaturePF2e<TParent> {
    flags: CharacterFlags;
    readonly _source: CharacterSource;
    system: CharacterSystemData;

    getResource(resource: "hero-points" | "mythic-points" | "focus" | "investiture" | "infused-reagents"): ResourceData;
    getResource(resource: string): ResourceData | null;
}

interface PrepareStrikeOptions {
    categories: WeaponCategory[];
    handsReallyFree: ZeroToTwo;
    ammos?: (ConsumablePF2e<CharacterPF2e> | WeaponPF2e<CharacterPF2e>)[];
}

export { CharacterPF2e };
