import { ActorPF2e, CreaturePF2e, type FamiliarPF2e } from "@actor";
import { Abilities, CreatureSpeeds, LabeledSpeed, SkillAbbreviation } from "@actor/creature/data.ts";
import { CreatureUpdateContext } from "@actor/creature/types.ts";
import { ALLIANCES, SAVING_THROW_DEFAULT_ATTRIBUTES } from "@actor/creature/values.ts";
import { StrikeData } from "@actor/data/base.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import {
    calculateMAPs,
    getStrikeAttackDomains,
    getStrikeDamageDomains,
    isReallyPC,
    setHitPointsRollOptions,
} from "@actor/helpers.ts";
import { ActorInitiative } from "@actor/initiative.ts";
import {
    CheckModifier,
    ModifierPF2e,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
    adjustModifiers,
    createAttributeModifier,
    createProficiencyModifier,
} from "@actor/modifiers.ts";
import { AttributeString, MovementType, RollContext, RollContextParams, SaveType } from "@actor/types.ts";
import {
    ATTRIBUTE_ABBREVIATIONS,
    SAVE_TYPES,
    SKILL_ABBREVIATIONS,
    SKILL_DICTIONARY,
    SKILL_EXPANDED,
} from "@actor/values.ts";
import type {
    AncestryPF2e,
    BackgroundPF2e,
    ClassPF2e,
    ConsumablePF2e,
    DeityPF2e,
    FeatPF2e,
    HeritagePF2e,
    PhysicalItemPF2e,
} from "@item";
import { ItemPF2e, WeaponPF2e } from "@item";
import { ActionTrait } from "@item/ability/types.ts";
import { ARMOR_CATEGORIES } from "@item/armor/values.ts";
import { ItemType, PhysicalItemSource } from "@item/base/data/index.ts";
import {
    getPropertyRuneDegreeAdjustments,
    getPropertyRuneStrikeAdjustments,
    getResilientBonus,
} from "@item/physical/runes.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { WeaponSource, WeaponSystemSource } from "@item/weapon/data.ts";
import { WeaponCategory } from "@item/weapon/types.ts";
import { WEAPON_CATEGORIES } from "@item/weapon/values.ts";
import { PROFICIENCY_RANKS, ZeroToFour, ZeroToTwo } from "@module/data.ts";
import {
    extractDegreeOfSuccessAdjustments,
    extractModifierAdjustments,
    extractModifiers,
    extractNotes,
    extractRollSubstitutions,
    extractRollTwice,
} from "@module/rules/helpers.ts";
import { UserPF2e } from "@module/user/document.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { CheckPF2e, CheckRoll, CheckRollContext } from "@system/check/index.ts";
import { DamagePF2e, DamageRollContext, DamageType } from "@system/damage/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { DAMAGE_TYPE_ICONS } from "@system/damage/values.ts";
import { WeaponDamagePF2e } from "@system/damage/weapon.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { AttackRollParams, DamageRollParams, RollParameters } from "@system/rolls.ts";
import { ArmorStatistic, Statistic, StatisticCheck } from "@system/statistic/index.ts";
import { ErrorPF2e, setHasElement, signedInteger, sluggify, traitSlugToObject, tupleHasValue } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import { CraftingEntry, CraftingEntryData, CraftingFormula } from "./crafting/index.ts";
import {
    BaseWeaponProficiencyKey,
    CharacterAbilities,
    CharacterAttributes,
    CharacterFlags,
    CharacterSource,
    CharacterStrike,
    CharacterSystemData,
    ClassDCData,
    MagicTraditionProficiencies,
    MartialProficiency,
    WeaponGroupProficiencyKey,
} from "./data.ts";
import { CharacterFeats } from "./feats.ts";
import {
    PCAttackTraitHelpers,
    WeaponAuxiliaryAction,
    createForceOpenPenalty,
    createHinderingPenalty,
    createShoddyPenalty,
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
    declare deityBoonsCurses: FeatPF2e<this>[];

    /** All base casting tradition proficiences, which spellcasting build off of */
    declare traditions: Record<MagicTradition, Statistic>;

    /** The primary class DC */
    declare classDC: Statistic | null;
    /** All class DCs, including the primary */
    declare classDCs: Record<string, Statistic>;
    /** Skills for the character, built during data prep */
    declare skills: CharacterSkills;

    declare initiative: ActorInitiative;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        const buildItems = ["ancestry", "heritage", "background", "class", "deity", "feat"] as const;
        return [...super.allowedItemTypes, ...buildItems, "physical", "spellcastingEntry", "spell", "action", "lore"];
    }

    get keyAttribute(): AttributeString {
        return this.system.details.keyability.value || "str";
    }

    /** @deprecated */
    get keyAbility(): AttributeString {
        foundry.utils.logCompatibilityWarning(
            "`CharacterPF2e#keyAbility` is deprecated. Use `CharacterPF2e#keyAttribute` instead.",
            { since: "5.2.0", until: "6.0.0" },
        );
        return this.keyAttribute;
    }

    /** This PC's ability scores */
    override get abilities(): CharacterAbilities {
        return deepClone(this.system.abilities);
    }

    get handsFree(): ZeroToTwo {
        const heldItems = this.inventory.filter((i) => i.isHeld);
        return Math.clamped(
            2 - R.sumBy(heldItems, (i) => (i.traits.has("free-hand") ? 0 : i.handsHeld)),
            0,
            2,
        ) as ZeroToTwo;
    }

    /** The number of hands this PC "really" has free: this is, ignoring allowances for the Free Hand trait */
    get handsReallyFree(): ZeroToTwo {
        const heldItems = this.inventory.filter((i) => i.isHeld);
        return Math.clamped(2 - R.sumBy(heldItems, (i) => i.handsHeld), 0, 2) as ZeroToTwo;
    }

    override get hitPoints(): CharacterHitPointsSummary {
        return {
            ...super.hitPoints,
            recoveryMultiplier: this.system.attributes.hp.recoveryMultiplier,
            recoveryAddend: this.system.attributes.hp.recoveryAddend,
        };
    }

    get heroPoints(): { value: number; max: number } {
        return deepClone(this.system.resources.heroPoints);
    }

    /** Retrieve lore skills, class statistics, and tradition-specific spellcasting */
    override getStatistic(slug: GuaranteedGetStatisticSlug): Statistic;
    override getStatistic(slug: string): Statistic | null;
    override getStatistic(slug: string): Statistic | null {
        if (tupleHasValue(["class", "class-dc", "classDC"], slug)) return this.classDC;
        if (setHasElement(MAGIC_TRADITIONS, slug)) return this.traditions[slug];
        if (slug === "class-spell") {
            const highestClass = Object.values(this.classDCs)
                .sort((a, b) => b.mod - a.mod)
                .shift();
            const highestSpell = this.spellcasting.contents
                .flatMap((s) => s.statistic ?? [])
                .sort((a, b) => b.mod - a.mod)
                .shift();
            return (
                R.compact([highestClass, highestSpell])
                    .sort((a, b) => b.mod - a.mod)
                    .shift() ?? null
            );
        }

        return this.classDCs[slug] ?? super.getStatistic(slug);
    }

    async getCraftingFormulas(): Promise<CraftingFormula[]> {
        const { formulas } = this.system.crafting;
        formulas.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
        const formulaMap = new Map(formulas.map((data) => [data.uuid, data]));
        const items = await UUIDUtils.fromUUIDs(formulas.map((f) => f.uuid));

        return items
            .filter((i): i is PhysicalItemPF2e => i instanceof ItemPF2e && i.isOfType("physical"))
            .map((item) => {
                const { dc, batchSize, deletable } = formulaMap.get(item.uuid) ?? { deletable: false };
                return new CraftingFormula(item, { dc, batchSize, deletable });
            });
    }

    async getCraftingEntries(formulas?: CraftingFormula[]): Promise<CraftingEntry[]> {
        const craftingFormulas = formulas ?? (await this.getCraftingFormulas());
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

        // If there are no parties, clear the exploration activities list
        if (!this.parties.size) {
            this.system.exploration = [];
        }

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
                {} as CharacterSheetTabVisibility,
            ),
            flags.pf2e.sheetTabs ?? {},
        );
        flags.pf2e.showBasicUnarmed ??= true;

        // Build selections: boosts and skill trainings
        const isGradual = game.settings.get("pf2e", "gradualBoostsVariant");
        const boostLevels = [1, 5, 10, 15, 20] as const;
        const allowedBoosts = boostLevels.reduce(
            (result, level) => {
                const allowed = (() => {
                    if (this.level === 0 && level === 1) return 4;
                    if (isGradual) return 4 - Math.clamped(level - this.level, 0, 4);
                    return this.level >= level ? 4 : 0;
                })();

                result[level] = allowed;
                return result;
            },
            {} as Record<(typeof boostLevels)[number], number>,
        );

        // Base ability scores
        const manualAttributes = Object.keys(this.system.abilities ?? {}).length > 0;
        this.system.abilities = R.mapToObj(Array.from(ATTRIBUTE_ABBREVIATIONS), (a) => [
            a,
            mergeObject({ mod: 0 }, this.system.abilities?.[a] ?? {}),
        ]);

        type SystemDataPartial = DeepPartial<
            Pick<CharacterSystemData, "build" | "crafting" | "proficiencies" | "saves">
        > & { abilities: Abilities };
        const systemData: SystemDataPartial = this.system;
        const existingBoosts = systemData.build?.attributes?.boosts;
        const isABP = game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(this);

        systemData.build = {
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
                flaws: {
                    ancestry: [],
                },
                apex: isABP ? systemData.build?.attributes?.apex ?? null : null,
            },
        };

        // Base saves structure
        systemData.saves = mergeObject(
            R.mapToObj(SAVE_TYPES, (t) => [t, { rank: 0, ability: SAVING_THROW_DEFAULT_ATTRIBUTES[t] }]),
            systemData.saves ?? {},
        );

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
        attributes.polymorphed = false;
        attributes.battleForm = false;
        attributes.classDC = null;
        attributes.spellDC = null;
        attributes.classOrSpellDC = { rank: 0, value: 0 };

        const perception = (attributes.perception ??= { ability: "wis", rank: 0 });
        perception.ability = "wis";
        perception.rank ??= 0;

        // Hit points
        const hitPoints = this.system.attributes.hp;
        hitPoints.recoveryMultiplier = 1;
        hitPoints.recoveryAddend = 0;
        attributes.ancestryhp = 0;
        attributes.classhp = 0;

        // Skills
        const { skills } = this.system;
        for (const key of SKILL_ABBREVIATIONS) {
            const skill = skills[key];
            skill.ability = SKILL_EXPANDED[SKILL_DICTIONARY[key]].attribute;
            skill.armor = ["dex", "str"].includes(skill.ability);
        }

        // Familiar abilities
        attributes.familiarAbilities = { value: 0 };

        // Spellcasting-tradition proficiencies
        systemData.proficiencies = {
            ...systemData.proficiencies,
            classDCs: {},
            traditions: Array.from(MAGIC_TRADITIONS).reduce(
                (accumulated: DeepPartial<MagicTraditionProficiencies>, t) => ({
                    ...accumulated,
                    [t]: { rank: 0 },
                }),
                {},
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

        // Attack and defense proficiencies
        type PartialMartialProficiency = Record<string, Partial<MartialProficiency> | undefined>;
        const attacks: PartialMartialProficiency = (systemData.proficiencies.attacks ??= {});
        for (const category of WEAPON_CATEGORIES) {
            attacks[category] = {
                rank: attacks[category]?.rank ?? 0,
                custom: !!attacks[category]?.custom,
                immutable: !!attacks[category]?.custom,
            };
        }
        const homebrewCategories = game.settings.get("pf2e", "homebrew.weaponCategories").map((tag) => tag.id);
        for (const category of homebrewCategories) {
            attacks[category] ??= {
                rank: 0,
                custom: !!attacks[category]?.custom,
                immutable: !!attacks[category]?.custom,
            };
        }

        const defenses: PartialMartialProficiency = (systemData.proficiencies.defenses ??= {});
        for (const category of ARMOR_CATEGORIES) {
            defenses[category] = {
                rank: defenses[category]?.rank ?? 0,
                // Barding will only be trained under unusual circumstances: make sure they never get stored
                immutable: ["light-barding", "heavy-barding"].includes(category),
            };
        }

        // Indicate that crafting formulas stored directly on the actor are deletable
        systemData.crafting = mergeObject({ formulas: [], entries: {} }, systemData.crafting ?? {});
        for (const formula of this.system.crafting.formulas) {
            formula.deletable = true;
        }

        // PC level is never a derived number, so it can be set early
        this.rollOptions.all[`self:level:${this.level}`] = true;
    }

    /** After AE-likes have been applied, set numeric roll options */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();

        for (const attribute of Object.values(this.system.abilities)) {
            attribute.mod = Math.trunc(attribute.mod) || 0;
        }

        this.setNumericRollOptions();
        this.deity?.setFavoredWeaponRank();
    }

    /**
     * Immediately after boosts from this PC's ancestry, background, and class have been acquired, set attribute
     * modifiers according to them.
     */
    override prepareDataFromItems(): void {
        super.prepareDataFromItems();
        this.setAttributeModifiers();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        imposeOversizedWeaponCondition(this);

        const systemData = this.system;
        const { synthetics } = this;

        game.pf2e.variantRules.AutomaticBonusProgression.concatModifiers(this);

        // Update experience percentage from raw experience amounts.
        systemData.details.xp.pct = Math.min(
            Math.round((systemData.details.xp.value * 100) / systemData.details.xp.max),
            99.5,
        );

        // PFS Level Bump - check and DC modifiers
        if (systemData.pfs.levelBump) {
            const params = { slug: "level-bump", label: "PF2E.PFS.LevelBump", modifier: 1 };
            this.synthetics.modifiers.all.push(() => new ModifierPF2e(params));
            this.synthetics.modifiers.damage.push(() => new ModifierPF2e(params));
        }

        // Calculate HP and SP
        {
            const ancestryHP = systemData.attributes.ancestryhp;
            const classHP = systemData.attributes.classhp;
            const hitPoints = systemData.attributes.hp;
            const modifiers = [new ModifierPF2e("PF2E.AncestryHP", ancestryHP, "untyped")];

            if (game.settings.get("pf2e", "staminaVariant")) {
                const halfClassHp = Math.floor(classHP / 2);
                systemData.attributes.hp.sp = {
                    value: systemData.attributes.hp.sp?.value ?? 0,
                    max: (halfClassHp + systemData.abilities.con.mod) * this.level,
                };
                systemData.resources.resolve = {
                    value: systemData.resources.resolve?.value ?? 0,
                    max: systemData.abilities[systemData.details.keyability.value].mod,
                };

                modifiers.push(new ModifierPF2e("PF2E.ClassHP", halfClassHp * this.level, "untyped"));
            } else {
                modifiers.push(new ModifierPF2e("PF2E.ClassHP", classHP * this.level, "untyped"));
                delete systemData.resources.resolve;

                // Facilitate level-zero variant play by always adding the constitution modifier at at least level 1
                const conHP = systemData.abilities.con.mod * Math.max(this.level, 1);
                modifiers.push(
                    new ModifierPF2e({
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

            const stat = mergeObject(new StatisticModifier("hp", modifiers), hitPoints, { overwrite: false });

            // PFS Level Bump - hit points
            if (systemData.pfs.levelBump) {
                const hitPointsBump = Math.max(10, stat.totalModifier * 0.1);
                stat.push(new ModifierPF2e("PF2E.PFS.LevelBump", hitPointsBump, "untyped"));
            }

            stat.max = stat.totalModifier;
            stat.value = Math.min(stat.value, stat.max); // Make sure the current HP isn't higher than the max HP
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");
            systemData.attributes.hp = stat;

            setHitPointsRollOptions(this);
        }

        this.prepareFeats();
        this.prepareSaves();
        this.prepareMartialProficiencies();

        // Perception
        this.perception = new Statistic(this, {
            slug: "perception",
            label: "PF2E.PerceptionLabel",
            attribute: "wis",
            rank: systemData.attributes.perception.rank,
            domains: ["perception", "wis-based", "all"],
            check: { type: "perception-check" },
        });
        systemData.attributes.perception = mergeObject(
            systemData.attributes.perception,
            this.perception.getTraceData({ value: "mod" }),
        );

        // Skills
        this.skills = this.prepareSkills();

        // Senses
        this.system.traits.senses = this.prepareSenses(this.system.traits.senses, synthetics);

        // Magic Traditions Proficiencies (for spell attacks and counteract checks)
        this.traditions = Array.from(MAGIC_TRADITIONS).reduce(
            (traditions, tradition) => {
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
            },
            {} as Record<MagicTradition, Statistic>,
        );

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
        if (systemData.attributes.classDC) {
            systemData.attributes.classOrSpellDC = R.pick(systemData.attributes.classDC, ["rank", "value"]);
        }

        // Armor Class
        const armorStatistic = this.createArmorStatistic();
        this.armorClass = armorStatistic.dc;
        systemData.attributes.ac = armorStatistic.getTraceData();

        // Apply the speed penalty from this character's held shield
        const { heldShield } = this;
        if (heldShield?.speedPenalty) {
            const speedPenalty = new ModifierPF2e(heldShield.name, heldShield.speedPenalty, "untyped");
            speedPenalty.predicate.push({ not: "self:shield:ignore-speed-penalty" });
            this.synthetics.modifiers.speed ??= [];
            this.synthetics.modifiers.speed.push(() => speedPenalty);
        }

        // Speeds
        const speeds = (systemData.attributes.speed = this.prepareSpeed("land"));
        speeds.otherSpeeds = (["burrow", "climb", "fly", "swim"] as const).flatMap((m) => this.prepareSpeed(m) ?? []);

        // Strike actions
        systemData.actions = this.prepareStrikes();
        this.flags.pf2e.highestWeaponDamageDice = Math.max(
            ...systemData.actions.filter((s) => s.ready).map((s) => s.item.system.damage.dice),
            0,
        );

        // Initiative
        this.initiative = new ActorInitiative(this);
        this.system.attributes.initiative = this.initiative.getTraceData();

        // Resources
        const { focus, crafting } = this.system.resources;
        focus.max = Math.floor(Math.clamped(focus.max, 0, focus.cap));
        crafting.infusedReagents.max = Math.floor(crafting.infusedReagents.max) || 0;
        crafting.infusedReagents.value = Math.clamped(crafting.infusedReagents.value, 0, crafting.infusedReagents.max);
        // Ensure the character has a focus pool of at least one point if they have a focus spellcasting entry
        if (focus.max === 0 && this.spellcasting.regular.some((entry) => entry.isFocusPool)) {
            focus.max = 1;
        }

        // Set a roll option for whether this character has a familiar
        if (systemData.attributes.familiarAbilities.value > 0) {
            this.rollOptions.all["self:has-familiar"] = true;
        }
    }

    private setAttributeModifiers(): void {
        const { build } = this.system;

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
        for (const ability of Object.values(this.system.abilities)) {
            ability.mod = Math.clamped(ability.mod, -5, 10);
            // Record base (integer) modifier: same as stored modifier if in manual mode, and prior to RE
            // modifications otherwise. The final prepared modifier is truncated after application of AE-likes.
            ability.base = Math.trunc(ability.mod);
        }
    }

    /** Set roll operations for ability scores, proficiency ranks, and number of hands free */
    protected setNumericRollOptions(): void {
        const rollOptionsAll = this.rollOptions.all;

        const perceptionRank = this.system.attributes.perception.rank;
        rollOptionsAll[`perception:rank:${perceptionRank}`] = true;

        for (const key of ATTRIBUTE_ABBREVIATIONS) {
            const mod = this.abilities[key].mod;
            rollOptionsAll[`attribute:${key}:mod:${mod}`] = true;
        }

        for (const key of SKILL_ABBREVIATIONS) {
            const rank = this.system.skills[key].rank;
            rollOptionsAll[`skill:${key}:rank:${rank}`] = true;
        }

        for (const key of WEAPON_CATEGORIES) {
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
            this.traits.has("animal") && !isReallyPC(this)
                ? (Math.max(this.system.proficiencies.defenses["light-barding"].rank, 1) as ZeroToFour)
                : 0;

        const modifiers: ModifierPF2e[] = [];
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
        const proficiency = Object.entries(this.system.proficiencies.defenses as Record<string, MartialProficiency>)
            .filter(([key, proficiency]) => {
                if (!wornArmor) return key === "unarmored";
                if (wornArmor.category === key) return true;
                return proficiency.definition?.test(wornArmor.getRollOptions("item")) ?? false;
            })
            .map(([_k, v]) => v)
            .reduce((best, p) => (p.rank > best.rank ? p : best), { rank: 0 as ZeroToFour });

        return new ArmorStatistic(this, {
            rank: proficiency.rank,
            attribute: attributeModifier.ability!,
            modifiers: [attributeModifier],
        });
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
                const resilientBonus = getResilientBonus(wornArmor.system);
                if (resilientBonus > 0 && wornArmor.isInvested) {
                    modifiers.push(new ModifierPF2e(wornArmor.name, resilientBonus, "item"));
                }
            }

            const affectedByBulwark = saveType === "reflex" && wornArmor?.traits.has("bulwark");
            if (affectedByBulwark) {
                const slug = "bulwark";
                const bulwarkModifier = new ModifierPF2e({
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
                    test: (options): boolean => new PredicatePF2e("damaging-effect").test(options),
                    suppress: true,
                });
            }

            const stat = new Statistic(this, {
                slug: saveType,
                label: saveName,
                attribute: save.ability,
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

    private prepareSkills(): CharacterSkills {
        const systemData = this.system;

        // rebuild the skills object to clear out any deleted or renamed skills from previous iterations
        const { synthetics, wornArmor } = this;

        const skills = Array.from(SKILL_ABBREVIATIONS).reduce((builtSkills, shortForm) => {
            const skill = systemData.skills[shortForm];
            const longForm = SKILL_DICTIONARY[shortForm];
            const label = CONFIG.PF2E.skillList[longForm] ?? longForm;

            const domains = [longForm, `${skill.ability}-based`, "skill-check", `${skill.ability}-skill-check`, "all"];
            const modifiers: ModifierPF2e[] = [];

            // Indicate that the strength requirement of this actor's armor is met
            const strengthRequirement = wornArmor?.strength;
            if (typeof strengthRequirement === "number" && this.system.abilities.str.mod >= strengthRequirement) {
                for (const selector of ["skill-check", "initiative"]) {
                    const rollOptions = (this.rollOptions[selector] ??= {});
                    rollOptions["armor:strength-requirement-met"] = true;
                }
            }

            if (skill.armor && typeof wornArmor?.checkPenalty === "number") {
                const slug = "armor-check-penalty";
                const armorCheckPenalty = new ModifierPF2e({
                    slug,
                    label: "PF2E.ArmorCheckPenalty",
                    modifier: wornArmor.checkPenalty,
                    type: "untyped",
                    adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, domains, slug),
                });

                // Set requirements for ignoring the check penalty according to skill
                armorCheckPenalty.predicate.push({ nor: ["attack", "armor:ignore-check-penalty"] });
                if (["acrobatics", "athletics"].includes(longForm)) {
                    armorCheckPenalty.predicate.push({
                        nor: ["armor:strength-requirement-met", "armor:trait:flexible"],
                    });
                } else if (longForm === "stealth" && wornArmor.traits.has("noisy")) {
                    armorCheckPenalty.predicate.push({
                        nand: ["armor:strength-requirement-met", "armor:ignore-noisy-penalty"],
                    });
                } else {
                    armorCheckPenalty.predicate.push({ not: "armor:strength-requirement-met" });
                }

                modifiers.push(armorCheckPenalty);
            }

            // Add a penalty for attempting to Force Open without a crowbar or similar tool
            if (longForm === "athletics") modifiers.push(createForceOpenPenalty(this, domains));

            const statistic = new Statistic(this, {
                slug: longForm,
                label,
                rank: skill.rank,
                attribute: skill.ability,
                domains,
                modifiers,
                lore: false,
                check: { type: "skill-check" },
            }) as CharacterSkill;

            builtSkills[longForm] = statistic;
            this.system.skills[shortForm] = mergeObject(this.system.skills[shortForm], statistic.getTraceData());

            return builtSkills;
        }, {} as CharacterSkills);

        // Lore skills
        for (const loreItem of this.itemTypes.lore) {
            // normalize skill name to lower-case and dash-separated words
            const longForm = sluggify(loreItem.name);
            const rank = loreItem.system.proficient.value;

            const domains = [longForm, "int-based", "skill-check", "lore-skill-check", "int-skill-check", "all"];

            const statistic = new Statistic(this, {
                slug: longForm,
                label: loreItem.name,
                rank,
                attribute: "int",
                domains,
                lore: true,
                check: { type: "skill-check" },
            }) as CharacterSkill;

            skills[longForm] = statistic;
            this.system.skills[longForm as SkillAbbreviation] = {
                armor: false,
                ability: "int",
                rank,
                lore: true,
                itemID: loreItem.id,
                ...statistic.getTraceData(),
            };
        }

        return skills;
    }

    override prepareSpeed(movementType: "land"): CreatureSpeeds;
    override prepareSpeed(movementType: Exclude<MovementType, "land">): (LabeledSpeed & StatisticModifier) | null;
    override prepareSpeed(movementType: MovementType): CreatureSpeeds | (LabeledSpeed & StatisticModifier) | null;
    override prepareSpeed(movementType: MovementType): CreatureSpeeds | (LabeledSpeed & StatisticModifier) | null {
        const statistic = super.prepareSpeed(movementType);
        if (!statistic) return null;

        const { wornArmor } = this;
        const basePenalty = wornArmor?.speedPenalty ?? 0;
        const strength = this.system.abilities.str.mod;
        const requirement = wornArmor?.strength ?? strength;
        const penaltyValue = strength >= requirement ? Math.min(basePenalty + 5, 0) : basePenalty;
        const derivedFromLand = !!("derivedFromLand" in statistic && statistic.derivedFromLand);
        const modifierName = wornArmor?.name ?? "PF2E.ArmorSpeedLabel";
        const slug = "armor-speed-penalty";
        const armorPenalty =
            penaltyValue && !derivedFromLand
                ? new ModifierPF2e({
                      slug,
                      label: modifierName,
                      modifier: penaltyValue,
                      type: "untyped",
                      predicate: new PredicatePF2e({ not: "armor:ignore-speed-penalty" }),
                      adjustments: extractModifierAdjustments(
                          this.synthetics.modifierAdjustments,
                          ["all-speeds", "speed", `${movementType}-speed`],
                          slug,
                      ),
                  })
                : null;

        if (armorPenalty) {
            statistic.push(armorPenalty);
            statistic.calculateTotal(new Set(this.getRollOptions(["all-speeds", "speed", `${movementType}-speed`])));
        }

        // A hindering penalty can't be removed or mitigated
        const hinderingPenalty = createHinderingPenalty(this);
        if (hinderingPenalty) statistic.push(hinderingPenalty);

        return statistic;
    }

    private prepareFeats(): void {
        this.pfsBoons = [];
        this.deityBoonsCurses = [];
        this.feats = new CharacterFeats(this);

        const campaignFeatSections = game.settings.get("pf2e", "campaignFeatSections");
        for (const section of campaignFeatSections) {
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
                this.deityBoonsCurses.push(feat);
            }
        }
    }

    prepareClassDC(slug: string, classDC: Pick<ClassDCData, "label" | "ability" | "rank" | "primary">): Statistic {
        classDC.ability ??= "str";
        classDC.rank ??= 0;
        classDC.primary ??= false;

        const classNames: Record<string, string | undefined> = CONFIG.PF2E.classTraits;
        classDC.label = classDC.label ?? classNames[slug] ?? slug.titleCase();

        return new Statistic(this, {
            slug,
            label: classDC.label,
            attribute: classDC.ability,
            rank: classDC.rank,
            domains: ["class", slug, `${classDC.ability}-based`, "all"],
            check: { type: "check" },
        });
    }

    /** Prepare this character's strike actions */
    prepareStrikes({ includeBasicUnarmed = true } = {}): CharacterStrike[] {
        const { itemTypes, synthetics } = this;

        // Acquire the character's handwraps of mighty blows and apply its runes to all unarmed attacks
        const handwrapsSlug = "handwraps-of-mighty-blows";
        const handwraps = itemTypes.weapon.find(
            (w) => w.slug === handwrapsSlug && w.category === "unarmed" && w.isEquipped,
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
                          ...(unarmedRunes ?? {}),
                      },
                  };

                  // No handwraps, so generate straight from source
                  return new WeaponPF2e(source, { parent: this });
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

        const ammos = [
            ...itemTypes.consumable.filter((i) => i.category === "ammo" && !i.isStowed),
            ...itemTypes.weapon.filter((w) => w.system.usage.canBeAmmo),
        ];
        const homebrewCategoryTags = game.settings.get("pf2e", "homebrew.weaponCategories");
        const offensiveCategories = [...WEAPON_CATEGORIES, ...homebrewCategoryTags.map((tag) => tag.id)];

        // Exclude handwraps as a strike
        const weapons = [
            itemTypes.weapon.filter((w) => w.slug !== handwrapsSlug),
            Array.from(synthetics.strikes.values()),
            basicUnarmed ?? [],
        ].flat() as WeaponPF2e<this>[];

        // Sort alphabetically, force basic unarmed attack to end, and finally move all readied strikes to beginning
        const { handsReallyFree } = this;
        return weapons
            .map((w) => this.prepareStrike(w, { categories: offensiveCategories, handsReallyFree, ammos }))
            .sort((a, b) =>
                a.label
                    .toLocaleLowerCase(game.i18n.lang)
                    .replace(/[-0-9\s]/g, "")
                    .localeCompare(b.label.toLocaleLowerCase(game.i18n.lang).replace(/[-0-9\s]/gi, ""), game.i18n.lang),
            )
            .sort((a, b) => (a.slug === "basic-unarmed" ? 1 : b.slug === "basic-unarmed" ? -1 : 0))
            .sort((a, b) => (a.ready !== b.ready ? (a.ready ? 0 : 1) - (b.ready ? 0 : 1) : 0));
    }

    /** Prepare a strike action from a weapon */
    private prepareStrike(
        weapon: WeaponPF2e<this>,
        { categories, handsReallyFree, ammos = [] }: PrepareStrikeOptions,
    ): CharacterStrike {
        const { synthetics } = this;
        const modifiers: ModifierPF2e[] = [];
        const systemData = this.system;

        // Apply strike adjustments affecting the weapon
        const strikeAdjustments = [
            synthetics.strikeAdjustments,
            getPropertyRuneStrikeAdjustments(weapon.system.runes.property),
        ].flat();
        for (const adjustment of strikeAdjustments) {
            adjustment.adjustWeapon?.(weapon);
        }
        const weaponRollOptions = weapon.getRollOptions("item");
        const weaponTraits = weapon.traits;

        // If the character has an ancestral weapon familiarity or similar feature, it will make weapons that meet
        // certain criteria also count as weapon of different category
        const { proficiencies } = systemData;
        const categoryRank = proficiencies.attacks[weapon.category]?.rank ?? 0;
        const groupRank = proficiencies.attacks[`weapon-group-${weapon.group}`]?.rank ?? 0;

        // Weapons that are interchangeable for all rules purposes (e.g., longbow and composite longbow)
        const equivalentWeapons: Record<string, string | undefined> = CONFIG.PF2E.equivalentWeapons;
        const baseWeapon = equivalentWeapons[weapon.baseType ?? ""] ?? weapon.baseType;
        const baseWeaponRank = proficiencies.attacks[`weapon-base-${baseWeapon}`]?.rank ?? 0;

        // If a weapon matches against a linked proficiency, temporarily add the `sameAs` category to the weapon's
        // item roll options
        const equivalentCategories = Object.values(proficiencies.attacks).flatMap((p) =>
            !!p && "sameAs" in p && (p.definition?.test(weaponRollOptions) ?? true) ? `item:category:${p.sameAs}` : [],
        );
        const weaponProficiencyOptions = new Set(weaponRollOptions.concat(equivalentCategories));

        const syntheticRanks = R.compact(Object.values(proficiencies.attacks))
            .filter((p) => p.immutable && (p.definition?.test(weaponProficiencyOptions) ?? true))
            .map((p) => p.rank);

        const proficiencyRank = Math.max(categoryRank, groupRank, baseWeaponRank, ...syntheticRanks) as ZeroToFour;
        const meleeOrRanged = weapon.isMelee ? "melee" : "ranged";
        const baseOptions = new Set([
            "action:strike",
            `item:proficiency:rank:${proficiencyRank}`,
            // @todo migrate away:
            PROFICIENCY_RANK_OPTION[proficiencyRank],
            ...weaponTraits, // always add weapon traits as options
            meleeOrRanged,
        ]);

        const attackDomains = getStrikeAttackDomains(weapon, proficiencyRank, baseOptions);

        // Determine the default ability and score for this attack.
        const { defaultAttribute } = weapon;
        modifiers.push(createAttributeModifier({ actor: this, attribute: defaultAttribute, domains: attackDomains }));
        if (weapon.isMelee && weaponTraits.has("finesse")) {
            modifiers.push(createAttributeModifier({ actor: this, attribute: "dex", domains: attackDomains }));
        }
        if (weapon.isRanged && weaponTraits.has("brutal")) {
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
                modifiers.push(new ModifierPF2e("PF2E.ItemBonusLabel", attackBonus, "item"));
            }
        }

        // Get best weapon potency
        const weaponPotency = (() => {
            const potency = attackDomains
                .flatMap((key) => deepClone(synthetics.weaponPotency[key] ?? []))
                .filter((wp) => wp.predicate.test(initialRollOptions));

            if (weapon.system.runes.potency) {
                potency.push({
                    label: "PF2E.Item.Weapon.Rune.Potency",
                    bonus: weapon.system.runes.potency,
                    type: "item",
                    predicate: new PredicatePF2e(),
                });
            }

            return potency.length > 0
                ? potency.reduce((highest, current) => (highest.bonus > current.bonus ? highest : current))
                : null;
        })();

        if (weaponPotency) {
            modifiers.push(new ModifierPF2e(weaponPotency.label, weaponPotency.bonus, weaponPotency.type));
            // In case of a WeaponPotency RE, add traits to establish the weapon as being magical
            if (!weapon.isMagical && (weaponPotency.type === "item" || !ABP.isEnabled(weapon.actor))) {
                weapon.system.traits.value.push("magical");
            }

            // Update logged value in case a rule element has changed it
            weapon.flags.pf2e.attackItemBonus = weaponPotency.bonus;
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

        if (weapon.system.traits.toggles.modular.options.length > 0) {
            auxiliaryActions.push(new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "Modular" }));
        }
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
                            new WeaponAuxiliaryAction({ weapon, action: "Release", purpose: "Grip", hands: 1 }),
                        );
                    } else if (weapon.handsHeld === 1 && canWield2H) {
                        auxiliaryActions.push(
                            new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "Grip", hands: 2 }),
                        );
                    }
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "Sheathe", hands: 0 }),
                    );
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "Release", purpose: "Drop", hands: 0 }),
                    );
                    break;
                }
                case "worn": {
                    if (canWield2H) {
                        auxiliaryActions.push(
                            new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "Draw", hands: 2 }),
                        );
                    }
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "Draw", hands: 1 }),
                    );
                    break;
                }
                case "stowed": {
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "Retrieve", hands: 1 }),
                    );
                    break;
                }
                case "dropped": {
                    if (canWield2H) {
                        auxiliaryActions.push(
                            new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "PickUp", hands: 2 }),
                        );
                    }
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "PickUp", hands: 1 }),
                    );
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
                    const weaponTraits: Record<string, string | undefined> = CONFIG.PF2E.weaponTraits;
                    return weaponTraits[`versatile-${damageType}`] ?? CONFIG.PF2E.damageTypes[damageType];
                }
            }
        };

        const handsAvailable = !weapon.system.graspingAppendage || handsReallyFree > 0;

        const ready =
            (weapon.isEquipped && handsAvailable) ||
            (weapon.isThrown && weapon.reload === "0" && weapon.isWorn && handsReallyFree > 0);

        const action: CharacterStrike = mergeObject(strikeStat, {
            label: weapon.name,
            quantity: weapon.quantity,
            ready,
            domains: attackDomains,
            visible: weapon.slug !== "basic-unarmed" || this.flags.pf2e.showBasicUnarmed,
            glyph: "A",
            item: weapon,
            type: "strike" as const,
            ...flavor,
            options: Array.from(baseOptions),
            traits: [],
            handsAvailable,
            weaponTraits: Array.from(weaponTraits)
                .map((t) => traitSlugToObject(t, CONFIG.PF2E.npcAttackTraits))
                .sort((a, b) => a.label.localeCompare(b.label)),
            variants: [],
            selectedAmmoId: weapon.system.selectedAmmoId,
            altUsages,
            auxiliaryActions,
            versatileOptions: weapon.system.traits.toggles.versatile.options.map((o) => ({
                value: o,
                selected: weapon.system.traits.toggles.versatile.selection === o,
                label: versatileLabel(o),
                glyph: DAMAGE_TYPE_ICONS[o],
            })),
        });

        if (action.versatileOptions.length > 0) {
            action.versatileOptions.unshift({
                value: weapon.system.damage.damageType,
                selected: weapon.system.traits.toggles.versatile.selection === null,
                label: CONFIG.PF2E.damageTypes[weapon.system.damage.damageType],
                glyph: DAMAGE_TYPE_ICONS[weapon.system.damage.damageType],
            });
        }

        // Show the ammo list if the weapon requires ammo
        if (weapon.requiresAmmo) {
            const compatible = ammos.filter((a) => a.isAmmoFor(weapon));
            const incompatible = ammos.filter((a) => !a.isAmmoFor(weapon));
            const { ammo } = weapon;
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

        // Multiple attack penalty
        const maps = calculateMAPs(weapon, { domains: attackDomains, options: initialRollOptions });
        const createMapModifier = (prop: "map1" | "map2") => {
            return new ModifierPF2e({
                slug: maps.slug,
                label: maps.label,
                modifier: maps[prop],
                adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, attackDomains, maps.slug),
            });
        };

        const createMapLabel = (prop: "map1" | "map2") => {
            const modifier = createMapModifier(prop);
            adjustModifiers([modifier], new Set(rollOptions));
            const penalty = modifier.ignored ? 0 : modifier.value;
            return game.i18n.format("PF2E.MAPAbbreviationValueLabel", {
                value: signedInteger(action.totalModifier + penalty),
                penalty,
            });
        };

        // Defer in case total modifier is recalulated with a different result later
        const labels = [
            () => signedInteger(action.totalModifier),
            () => createMapLabel("map1"),
            () => createMapLabel("map2"),
        ];

        const checkModifiers = [
            (statistic: StrikeData, otherModifiers: ModifierPF2e[]) =>
                new CheckModifier("strike", statistic, otherModifiers),
            (statistic: StrikeData, otherModifiers: ModifierPF2e[]) =>
                new CheckModifier("strike-map1", statistic, [...otherModifiers, createMapModifier("map1")]),
            (statistic: StrikeData, otherModifiers: ModifierPF2e[]) =>
                new CheckModifier("strike-map2", statistic, [...otherModifiers, createMapModifier("map2")]),
        ];

        action.variants = [0, 1, 2].map((mapIncreases) => ({
            get label(): string {
                return labels[mapIncreases]();
            },
            roll: async (params: AttackRollParams = {}): Promise<Rolled<CheckRoll> | null> => {
                params.options ??= [];
                params.consumeAmmo ??= weapon.requiresAmmo;

                if (weapon.requiresAmmo && params.consumeAmmo && !weapon.ammo) {
                    ui.notifications.warn(
                        game.i18n.format("PF2E.Strike.Ranged.NoAmmo", { weapon: weapon.name, actor: this.name }),
                    );
                    return null;
                }

                const context = await this.getCheckContext({
                    item: weapon,
                    domains: attackDomains,
                    statistic: action,
                    target: { token: params.target ?? game.user.targets.first() ?? null },
                    defense: "armor",
                    options: new Set([...baseOptions, ...params.options]),
                    viewOnly: params.getFormula,
                });

                // Check whether target is out of maximum range; abort early if so
                if (context.self.item.isRanged && typeof context.target?.distance === "number") {
                    const maxRange = context.self.item.range?.max ?? 10;
                    if (context.target.distance > maxRange) {
                        ui.notifications.warn("PF2E.Action.Strike.OutOfRange", { localize: true });
                        return null;
                    }
                }

                // Get just-in-time roll options from rule elements
                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    rule.beforeRoll?.(attackDomains, context.options);
                }

                const dc = params.dc ?? context.dc;

                const notes = extractNotes(context.self.actor.synthetics.rollNotes, attackDomains);
                const rollTwice =
                    params.rollTwice ||
                    extractRollTwice(context.self.actor.synthetics.rollTwice, attackDomains, context.options);
                const substitutions = extractRollSubstitutions(
                    context.self.actor.synthetics.rollSubstitutions,
                    attackDomains,
                    context.options,
                );
                const dosAdjustments = [
                    getPropertyRuneDegreeAdjustments(context.self.item),
                    extractDegreeOfSuccessAdjustments(context.self.actor.synthetics, attackDomains),
                ].flat();

                const title = game.i18n.format(
                    weapon.isMelee ? "PF2E.Action.Strike.MeleeLabel" : "PF2E.Action.Strike.RangedLabel",
                    { weapon: weapon.name },
                );

                const checkContext: CheckRollContext = {
                    type: "attack-roll",
                    identifier: `${weapon.id}.${weaponSlug}.${meleeOrRanged}`,
                    action: "strike",
                    title,
                    actor: context.self.actor,
                    token: context.self.token,
                    target: context.target,
                    item: context.self.item,
                    altUsage: params.altUsage ?? null,
                    damaging: context.self.item.dealsDamage,
                    domains: attackDomains,
                    options: context.options,
                    notes,
                    dc,
                    traits: context.traits,
                    rollTwice,
                    substitutions,
                    dosAdjustments,
                    mapIncreases: mapIncreases as ZeroToTwo,
                };

                if (params.consumeAmmo && !this.consumeAmmo(context.self.item, params)) {
                    return null;
                }

                const check = checkModifiers[mapIncreases](context.self.statistic ?? action, context.self.modifiers);
                const roll = await CheckPF2e.roll(check, checkContext, params.event, params.callback);

                if (roll) {
                    for (const rule of context.self.actor.rules.filter((r) => !r.ignored)) {
                        await rule.afterRoll?.({
                            roll,
                            check,
                            context: checkContext,
                            domains: attackDomains,
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
                const domains = getStrikeDamageDomains(weapon, proficiencyRank);
                params.options = new Set(params.options ?? []);
                const targetToken = params.target ?? game.user.targets.first() ?? null;

                const context = await this.getDamageRollContext({
                    item: weapon,
                    viewOnly: params.getFormula ?? false,
                    statistic: action,
                    target: { token: targetToken },
                    domains,
                    outcome: method === "damage" ? "success" : "criticalSuccess",
                    options: new Set([...baseOptions, ...params.options]),
                    checkContext: params.checkContext,
                });

                if (!context.self.item.dealsDamage) {
                    if (!params.getFormula) {
                        ui.notifications.warn("PF2E.ErrorMessage.WeaponNoDamage", { localize: true });
                        return null;
                    }
                    return "";
                }

                const outcome = method === "damage" ? "success" : "criticalSuccess";
                const { self, target, options } = context;
                const damageContext: DamageRollContext = {
                    type: "damage-roll",
                    sourceType: "attack",
                    self,
                    target,
                    outcome,
                    options,
                    domains,
                    ...eventToRollParams(params.event, { type: "damage" }),
                };

                // Include MAP increases in case any ability depends on it
                if (typeof params.mapIncreases === "number") {
                    damageContext.mapIncreases = params.mapIncreases;
                    damageContext.options.add(`map:increases:${params.mapIncreases}`);
                }

                if (params.getFormula) damageContext.skipDialog = true;

                const damage = await WeaponDamagePF2e.calculate({
                    weapon: context.self.item,
                    actor: context.self.actor,
                    actionTraits: context.traits,
                    weaponPotency,
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

    /** Modify this weapon from AdjustStrike rule elements */
    protected override getRollContext<
        TStatistic extends StatisticCheck | StrikeData | null,
        TItem extends ItemPF2e<ActorPF2e> | null,
    >(params: RollContextParams<TStatistic, TItem>): Promise<RollContext<this, TStatistic, TItem>>;
    protected override async getRollContext(params: RollContextParams): Promise<RollContext<this>> {
        const context = await super.getRollContext(params);
        if (params.statistic instanceof StatisticModifier && context.self.item?.isOfType("weapon")) {
            PCAttackTraitHelpers.adjustWeapon(context.self.item);
        }

        return context;
    }

    consumeAmmo(weapon: WeaponPF2e<this>, params: RollParameters): boolean {
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
                proficiency.rank = ((): ZeroToFour => {
                    const maxRankIndex = PROFICIENCY_RANKS.indexOf(proficiency.maxRank ?? "legendary");
                    return Math.min(category?.rank ?? 0, maxRankIndex) as ZeroToFour;
                })();
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
                    R.equals(p.definition ?? [], [...(proficiency.definition ?? [])])
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
                proficiency.breakdown = `${proficiencyBonus.label} ${signedInteger(proficiencyBonus.value)}`;
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
            await this.adjustCarryType(item, {
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
        changed: DeepPartial<CharacterSource>,
        options: CreatureUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        const systemData = this.system;

        // Clamp infused reagents
        if (typeof changed.system?.resources?.crafting?.infusedReagents?.value === "number") {
            changed.system.resources.crafting.infusedReagents.value =
                Math.max(0, Math.floor(changed.system.resources.crafting.infusedReagents.value)) || 0;
        }

        // Clamp level, allowing for level-0 variant rule and enough room for homebrew "mythical" campaigns
        if (changed.system?.details?.level || changed.system?.build?.attributes) {
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
                    currentHP === 0 ? 0 : 1, // Refrain from killing the character merely by lowering level
                );
                changed.system = mergeObject(changed.system ?? {}, { attributes: { hp: { value: newHP } } });
            }
        }

        // Clamp Stamina and Resolve
        if (game.settings.get("pf2e", "staminaVariant")) {
            // Do not allow stamina to go over max
            if (changed.system?.attributes?.hp?.sp) {
                changed.system.attributes.hp.sp.value =
                    Math.floor(
                        Math.clamped(
                            changed.system.attributes.hp.sp?.value ?? 0,
                            0,
                            systemData.attributes.hp.sp?.max ?? 0,
                        ),
                    ) || 0;
            }

            // Do not allow resolve to go over max
            if (changed.system?.resources?.resolve) {
                changed.system.resources.resolve.value =
                    Math.floor(
                        Math.clamped(
                            changed.system.resources.resolve.value ?? 0,
                            0,
                            systemData.resources.resolve?.max ?? 0,
                        ),
                    ) || 0;
            }
        }

        // Ensure minimum XP value and max
        const xp = changed.system?.details?.xp ?? {};
        if (typeof xp.value === "number") xp.value = Math.max(xp.value, 0);
        if (typeof xp.max === "number") xp.max = Math.max(xp.max, 1);

        // Add or remove class features as necessary, appropriate to the PC's level
        const newLevel = changed.system?.details?.level?.value ?? this.level;
        const actorClass = this.class;
        if (actorClass && newLevel !== this.level) {
            const current = this.itemTypes.feat.filter((feat) => feat.category === "classfeature");
            if (newLevel > this.level) {
                const classFeaturesToCreate = (await actorClass.createGrantedItems({ level: newLevel }))
                    .filter(
                        (feature) =>
                            feature.system.level.value > this.level &&
                            !current.some((currentFeature) => currentFeature.sourceId === feature.flags.core?.sourceId),
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
            if (typeof changed.system?.pfs?.[property] === "number") {
                const [min, max] = property === "playerNumber" ? [1, 9_999_999] : [2001, 9999];
                changed.system.pfs[property] = Math.clamped(changed.system.pfs[property] || 0, min, max);
            } else if (changed.system?.pfs && changed.system.pfs[property] !== null) {
                changed.system.pfs[property] = this.system.pfs[property] ?? null;
            }
        }

        return super._preUpdate(changed, options, user);
    }

    /** Toggle between boost-driven and manual management of ability scores */
    async toggleAttributeManagement(): Promise<void> {
        if (Object.keys(this._source.system.abilities ?? {}).length === 0) {
            // Add stored ability scores for manual management
            const baseAbilities = Array.from(ATTRIBUTE_ABBREVIATIONS).reduce(
                (accumulated: Record<string, { value: 10 }>, abbrev) => ({
                    ...accumulated,
                    [abbrev]: { value: 10 as const },
                }),
                {},
            );
            await this.update({ "system.abilities": baseAbilities });
        } else {
            // Delete stored ability scores for boost-driven management
            await this.update({ "system.-=abilities": null });
        }
    }
}

interface CharacterPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null>
    extends CreaturePF2e<TParent> {
    flags: CharacterFlags;
    readonly _source: CharacterSource;
    system: CharacterSystemData;
}

interface PrepareStrikeOptions {
    categories: WeaponCategory[];
    handsReallyFree: ZeroToTwo;
    ammos?: (ConsumablePF2e<CharacterPF2e> | WeaponPF2e<CharacterPF2e>)[];
}

export { CharacterPF2e };
