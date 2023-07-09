import { CreaturePF2e, FamiliarPF2e } from "@actor";
import { Abilities, CreatureSpeeds, LabeledSpeed, SkillAbbreviation } from "@actor/creature/data.ts";
import { CreatureUpdateContext } from "@actor/creature/types.ts";
import { ALLIANCES } from "@actor/creature/values.ts";
import { StrikeData } from "@actor/data/base.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { calculateMAPs } from "@actor/helpers.ts";
import { ActorInitiative } from "@actor/initiative.ts";
import {
    CheckModifier,
    ModifierPF2e,
    StatisticModifier,
    createAbilityModifier,
    createProficiencyModifier,
    ensureProficiencyOption,
} from "@actor/modifiers.ts";
import {
    AbilityString,
    AttackItem,
    CheckContext,
    CheckContextParams,
    MovementType,
    RollContext,
    RollContextParams,
    SaveType,
    SkillLongForm,
} from "@actor/types.ts";
import {
    ABILITY_ABBREVIATIONS,
    SAVE_TYPES,
    SKILL_ABBREVIATIONS,
    SKILL_DICTIONARY,
    SKILL_EXPANDED,
} from "@actor/values.ts";
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
import { ActionTrait } from "@item/action/data.ts";
import { ARMOR_CATEGORIES } from "@item/armor/values.ts";
import { ItemType, PhysicalItemSource } from "@item/data/index.ts";
import { getPropertyRuneStrikeAdjustments, getResilientBonus } from "@item/physical/runes.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { WeaponDamage, WeaponSource, WeaponSystemSource } from "@item/weapon/data.ts";
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
import { ArmorStatistic } from "@system/statistic/armor-class.ts";
import { Statistic, StatisticCheck } from "@system/statistic/index.ts";
import { ErrorPF2e, objectHasKey, sluggify, sortedStringify, traitSlugToObject } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import { CraftingEntry, CraftingEntryData, CraftingFormula } from "./crafting/index.ts";
import {
    BaseWeaponProficiencyKey,
    CharacterAttributes,
    CharacterFlags,
    CharacterProficiency,
    CharacterSaves,
    CharacterSource,
    CharacterStrike,
    CharacterSystemData,
    ClassDCData,
    LinkedProficiency,
    MagicTraditionProficiencies,
    MartialProficiencies,
    MartialProficiency,
    WeaponGroupProficiencyKey,
} from "./data.ts";
import { CharacterFeats } from "./feats.ts";
import {
    PCStrikeAttackTraits,
    WeaponAuxiliaryAction,
    createForceOpenPenalty,
    createHinderingPenalty,
    createShoddyPenalty,
    imposeOversizedWeaponCondition,
} from "./helpers.ts";
import { CharacterSheetTabVisibility } from "./sheet.ts";
import { CharacterHitPointsSummary, CharacterSkill, CharacterSkills, DexterityModifierCapData } from "./types.ts";
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

    get keyAbility(): AbilityString {
        return this.system.details.keyability.value || "str";
    }

    /** This PC's ability scores */
    override get abilities(): Abilities {
        return deepClone(this.system.abilities);
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

    /** Retrieve lore skills, class statistics, and spellcasting */
    override getStatistic(slug: SaveType | SkillLongForm | "perception" | "classDC" | MagicTradition): Statistic;
    override getStatistic(slug: string): Statistic | null;
    override getStatistic(slug: string): Statistic | null {
        if (slug === "classDC") return this.classDC;
        if (objectHasKey(this.traditions, slug)) return this.traditions[slug];
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
        const systemData: DeepPartial<CharacterSystemData> & { abilities: Abilities } = this.system;

        // template.json may be stale, work around it until core is fixed
        this.system.exploration ??= [];

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
        }, {} as Record<(typeof boostLevels)[number], number>);
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

            // These will only be trained under unusual circumstances, so make sure they never get stored
            if (["light-barding", "heavy-barding"].includes(category)) {
                proficiency.immutable = true;
            }

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

        imposeOversizedWeaponCondition(this);

        const systemData = this.system;
        const { synthetics } = this;

        game.pf2e.variantRules.AutomaticBonusProgression.concatModifiers(this);

        // Extract as separate variables for easier use in this method.
        const { statisticsModifiers } = synthetics;

        // Update experience percentage from raw experience amounts.
        systemData.details.xp.pct = Math.min(
            Math.round((systemData.details.xp.value * 100) / systemData.details.xp.max),
            99.5
        );

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
            const modifiers = [new ModifierPF2e("PF2E.AncestryHP", ancestryHP, "untyped")];

            if (game.settings.get("pf2e", "staminaVariant")) {
                const halfClassHp = Math.floor(classHP / 2);
                systemData.attributes.sp.max = (halfClassHp + systemData.abilities.con.mod) * this.level;
                systemData.attributes.resolve.max = systemData.abilities[systemData.details.keyability.value].mod;

                modifiers.push(new ModifierPF2e("PF2E.ClassHP", halfClassHp * this.level, "untyped"));
            } else {
                modifiers.push(new ModifierPF2e("PF2E.ClassHP", classHP * this.level, "untyped"));

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
                stat.push(new ModifierPF2e("PF2E.PFS.LevelBump", hitPointsBump, "untyped"));
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
        this.perception = new Statistic(this, {
            slug: "perception",
            label: "PF2E.PerceptionLabel",
            ability: "wis",
            rank: systemData.attributes.perception.rank,
            domains: ["perception", "wis-based", "all"],
            check: { type: "perception-check" },
        });
        systemData.attributes.perception = mergeObject(
            systemData.attributes.perception,
            this.perception.getTraceData({ value: "mod" })
        );

        // Skills
        this.skills = this.prepareSkills();

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
        const armorStatistic = this.createArmorStatistic();
        this.armorClass = armorStatistic.dc;
        systemData.attributes.ac = armorStatistic.getTraceData();

        // Apply the speed penalty from this character's held shield
        const { heldShield } = this;
        if (heldShield?.speedPenalty) {
            const speedPenalty = new ModifierPF2e(heldShield.name, heldShield.speedPenalty, "untyped");
            speedPenalty.predicate.push({ not: "self:shield:ignore-speed-penalty" });
            statisticsModifiers.speed ??= [];
            statisticsModifiers.speed.push(() => speedPenalty);
        }

        // Speeds
        const speeds = (systemData.attributes.speed = this.prepareSpeed("land"));
        speeds.otherSpeeds = (["burrow", "climb", "fly", "swim"] as const).flatMap((m) => this.prepareSpeed(m) ?? []);

        // Strike actions
        systemData.actions = this.prepareStrikes();
        this.flags.pf2e.highestWeaponDamageDice = Math.max(
            ...systemData.actions.filter((s) => s.ready).map((s) => s.item.system.damage.dice),
            0
        );

        // Spellcasting Entries
        for (const entry of this.itemTypes.spellcastingEntry) {
            if (entry.isInnate) {
                const allRanks = Object.values(this.traditions).map((t) => t.rank ?? 0);
                entry.system.proficiency.value = Math.max(1, entry.rank, ...allRanks) as ZeroToFour;
            }

            // Spellcasting entries extend other statistics, usually a tradition, but sometimes class dc
            const baseStat = this.getStatistic(entry.system.proficiency.slug);
            if (!baseStat) continue;

            entry.system.ability.value = baseStat.ability ?? entry.system.ability.value;
            entry.system.proficiency.value = Math.max(entry.rank, baseStat.rank ?? 0) as ZeroToFour;
            entry.statistic = baseStat.extend({
                slug: entry.slug ?? sluggify(`${entry.name}-spellcasting`),
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
        if (this.itemTypes.spellcastingEntry.length > 0) {
            const best = this.itemTypes.spellcastingEntry.reduce((previous, current) => {
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
        this.initiative = new ActorInitiative(this);
        this.system.attributes.initiative = this.initiative.getTraceData();

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
    }

    private setAbilityScores(): void {
        const { build } = this.system;

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

    private createArmorStatistic(): ArmorStatistic {
        const { synthetics, wornArmor } = this;

        // Upgrade light barding proficiency to trained if this PC is somehow an animal
        this.system.martial["light-barding"].rank = this.traits.has("animal")
            ? (Math.max(this.system.martial["light-barding"].rank, 1) as ZeroToFour)
            : 0;

        const modifiers: ModifierPF2e[] = [];
        const dexCapSources: DexterityModifierCapData[] = [
            { value: Infinity, source: "" },
            ...synthetics.dexterityModifierCaps,
        ];
        const proficiency = wornArmor?.category ?? "unarmored";

        if (wornArmor) {
            dexCapSources.push({ value: Number(wornArmor.dexCap ?? 0), source: wornArmor.name });
        }

        // DEX modifier is limited by the lowest cap, usually from armor
        const dexCap = dexCapSources.reduce((lowest, candidate) =>
            lowest.value > candidate.value ? candidate : lowest
        );
        const dexModifier = createAbilityModifier({
            actor: this,
            ability: "dex",
            domains: ["all", "ac", "dex-based"],
            max: dexCap.value,
        });

        // In case an ability other than DEX is added, find the best ability modifier and use that as the ability on
        // which AC is based
        const abilityModifier = modifiers
            .filter((m) => m.type === "ability" && !!m.ability)
            .reduce((best, modifier) => (modifier.modifier > best.modifier ? modifier : best), dexModifier);

        return new ArmorStatistic(this, {
            rank: this.system.martial[proficiency]?.rank ?? 0,
            ability: abilityModifier.ability!,
            modifiers: [abilityModifier],
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
                    type: "untyped",
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

            const statistic = new Statistic(this, {
                slug: longForm,
                label,
                rank: skill.rank,
                ability: skill.ability,
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
                ability: "int",
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
        const strength = this.system.abilities.str.value;
        const requirement = wornArmor?.strength ?? strength;
        const penaltyValue = strength >= requirement ? Math.min(basePenalty + 5, 0) : basePenalty;

        const modifierName = wornArmor?.name ?? "PF2E.ArmorSpeedLabel";
        const slug = "armor-speed-penalty";
        const armorPenalty = penaltyValue
            ? new ModifierPF2e({
                  slug,
                  label: modifierName,
                  modifier: penaltyValue,
                  type: "untyped",
                  predicate: new PredicatePF2e({ not: "armor:ignore-speed-penalty" }),
                  adjustments: extractModifierAdjustments(
                      this.synthetics.modifierAdjustments,
                      ["all-speeds", "speed", `${movementType}-speed`],
                      slug
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

        this.feats.assignFeats();

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
            ability: classDC.ability,
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
            ? ((): WeaponPF2e<this> => {
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

        const ammos = itemTypes.consumable.filter((i) => i.category === "ammo" && !i.isStowed);
        const homebrewCategoryTags = game.settings.get("pf2e", "homebrew.weaponCategories");
        const offensiveCategories = [...WEAPON_CATEGORIES, ...homebrewCategoryTags.map((tag) => tag.id)];

        // Exclude handwraps as a strike
        const weapons = [
            itemTypes.weapon.filter((w) => w.slug !== handwrapsSlug),
            Array.from(synthetics.strikes.values()),
            basicUnarmed ?? [],
        ].flat() as WeaponPF2e<this>[];

        // Sort alphabetically, force basic unarmed attack to end, and finally move all readied strikes to beginning
        return weapons
            .map((w) => this.prepareStrike(w, { categories: offensiveCategories, ammos }))
            .sort((a, b) =>
                a.label
                    .toLocaleLowerCase(game.i18n.lang)
                    .replace(/[-0-9\s]/g, "")
                    .localeCompare(b.label.toLocaleLowerCase(game.i18n.lang).replace(/[-0-9\s]/gi, ""), game.i18n.lang)
            )
            .sort((a, b) => (a.slug === "basic-unarmed" ? 1 : b.slug === "basic-unarmed" ? -1 : 0))
            .sort((a, b) => (a.ready !== b.ready ? (a.ready ? 0 : 1) - (b.ready ? 0 : 1) : 0));
    }

    /** Prepare a strike action from a weapon */
    private prepareStrike(
        weapon: WeaponPF2e<this>,
        options: {
            categories: WeaponCategory[];
            ammos?: ConsumablePF2e<CharacterPF2e>[];
            defaultAbility?: AbilityString;
        }
    ): CharacterStrike {
        const { synthetics } = this;
        const modifiers: ModifierPF2e[] = [];
        const systemData = this.system;
        const { categories } = options;
        const ammos = options.ammos ?? [];

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
            `${weapon.id}-attack`,
            `${slug}-attack`,
            `${slug}-attack-roll`,
            `${unarmedOrWeapon}-attack-roll`,
            `${meleeOrRanged}-attack-roll`,
            "strike-attack-roll",
            "attack-roll",
            "attack",
            "all",
        ];

        // Determine the default ability and score for this attack.
        const defaultAbility = options.defaultAbility ?? weapon.defaultAbility;
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

        if (weapon.group === "bomb" && !ABP.isEnabled(this)) {
            const attackBonus = Number(weapon.system.bonus?.value) || 0;
            if (attackBonus !== 0) {
                modifiers.push(new ModifierPF2e("PF2E.ItemBonusLabel", attackBonus, "item"));
            }
        }

        // Get best weapon potency
        const weaponPotency = (() => {
            const potency = selectors
                .flatMap((key) => deepClone(synthetics.weaponPotency[key] ?? []))
                .filter((wp) => wp.predicate.test(baseOptions));

            if (weapon.system.runes.potency) {
                potency.push({
                    label: "PF2E.PotencyRuneLabel",
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
            if (!weapon.isMagical) {
                weapon.system.traits.value.push("magical", "evocation");
            }
        }

        const shoddyPenalty = createShoddyPenalty(this, weapon, selectors);
        if (shoddyPenalty) modifiers.push(shoddyPenalty);

        // Everything from relevant synthetics
        modifiers.push(
            ...extractModifiers(synthetics, selectors, { injectables: { weapon }, resolvables: { weapon } })
        );

        // Multiple attack penalty
        const multipleAttackPenalty = calculateMAPs(weapon, { domains: selectors, options: baseOptions });

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
                            new WeaponAuxiliaryAction({ weapon, action: "Release", purpose: "Grip", hands: 1 })
                        );
                    } else if (weapon.handsHeld === 1 && canWield2H) {
                        auxiliaryActions.push(
                            new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "Grip", hands: 2 })
                        );
                    }
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "Sheathe", hands: 0 })
                    );
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "Release", purpose: "Drop", hands: 0 })
                    );
                    break;
                }
                case "worn": {
                    if (canWield2H) {
                        auxiliaryActions.push(
                            new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "Draw", hands: 2 })
                        );
                    }
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "Draw", hands: 1 })
                    );
                    break;
                }
                case "stowed": {
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "Retrieve", hands: 1 })
                    );
                    break;
                }
                case "dropped": {
                    if (canWield2H) {
                        auxiliaryActions.push(
                            new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "PickUp", hands: 2 })
                        );
                    }
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "Interact", purpose: "PickUp", hands: 1 })
                    );
                    break;
                }
            }
        }

        const flavor = this.getStrikeDescription(weapon);
        const rollOptions = [...this.getRollOptions(selectors), ...weaponRollOptions, ...weaponTraits, meleeOrRanged];
        const strikeStat = new StatisticModifier(slug, modifiers, rollOptions);
        const altUsages = weapon.getAltUsages().map((w) => this.prepareStrike(w, { categories }));
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

        const action: CharacterStrike = mergeObject(strikeStat, {
            label: weapon.name,
            imageUrl: weapon.img,
            quantity: weapon.quantity,
            ready: weapon.isEquipped,
            domains: selectors,
            visible: weapon.slug !== "basic-unarmed" || this.flags.pf2e.showBasicUnarmed,
            glyph: "A",
            item: weapon,
            type: "strike" as const,
            ...flavor,
            options: weapon.system.options?.value ?? [],
            traits: [],
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

        const labels: [() => string, () => string, () => string] = [
            () => {
                const strike = game.i18n.localize("PF2E.WeaponStrikeLabel");
                const value = action.totalModifier;
                const sign = value < 0 ? "" : "+";
                return `${strike} ${sign}${value}`;
            },
            () => game.i18n.format("PF2E.MAPAbbreviationLabel", { penalty: multipleAttackPenalty.map1 }),
            () => game.i18n.format("PF2E.MAPAbbreviationLabel", { penalty: multipleAttackPenalty.map2 }),
        ];
        const checkModifiers = [
            (statistic: StrikeData, otherModifiers: ModifierPF2e[]) =>
                new CheckModifier(checkName, statistic, otherModifiers),
            (statistic: StrikeData, otherModifiers: ModifierPF2e[]) =>
                new CheckModifier(checkName, statistic, [
                    ...otherModifiers,
                    new ModifierPF2e(multipleAttackPenalty.label, multipleAttackPenalty.map1, "untyped"),
                ]),
            (statistic: StrikeData, otherModifiers: ModifierPF2e[]) =>
                new CheckModifier(checkName, statistic, [
                    ...otherModifiers,
                    new ModifierPF2e(multipleAttackPenalty.label, multipleAttackPenalty.map2, "untyped"),
                ]),
        ];

        action.variants = [0, 1, 2]
            .map((index): [() => string, (statistic: StrikeData, otherModifiers: ModifierPF2e[]) => CheckModifier] => [
                labels[index],
                checkModifiers[index],
            ])
            .map(([getLabel, constructModifier], mapIncreases) => ({
                get label(): string {
                    return getLabel();
                },
                roll: async (params: AttackRollParams = {}): Promise<Rolled<CheckRoll> | null> => {
                    params.options ??= [];
                    params.consumeAmmo ??= weapon.requiresAmmo;

                    if (weapon.requiresAmmo && params.consumeAmmo && !weapon.ammo) {
                        ui.notifications.warn(
                            game.i18n.format("PF2E.Strike.Ranged.NoAmmo", { weapon: weapon.name, actor: this.name })
                        );
                        return null;
                    }

                    const context = await this.getCheckContext({
                        item: weapon,
                        domains: selectors,
                        statistic: action,
                        target: { token: game.user.targets.first() ?? null },
                        targetedDC: "armor",
                        options: new Set([...baseOptions, ...params.options, ...action.options]),
                        viewOnly: params.getFormula,
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
                        token: context.self.token,
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
                        mapIncreases: mapIncreases as ZeroToTwo,
                    };

                    if (params.consumeAmmo && !this.consumeAmmo(context.self.item, params)) {
                        return null;
                    }

                    const roll = await CheckPF2e.roll(
                        constructModifier(context.self.statistic ?? action, context.self.modifiers),
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
            action[method] = async (params: DamageRollParams = {}): Promise<string | Rolled<DamageRoll> | null> => {
                const domains = ["all", `${weapon.id}-damage`, "strike-damage", "damage-roll"];
                params.options ??= [];
                const targetToken = params.target ?? game.user.targets.first() ?? null;

                const context = await this.getRollContext({
                    item: weapon,
                    viewOnly: params.getFormula ?? false,
                    statistic: action,
                    target: { token: targetToken },
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
                    ...eventToRollParams(params.event),
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
                    proficiencyRank,
                    weaponPotency,
                    context: damageContext,
                });
                if (!damage) return null;

                // The damage template will include a full list of domains: replace the original, smaller list
                damageContext.domains = damage.domains;

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
    override getRollContext<TStatistic extends StatisticCheck | StrikeData | null, TItem extends AttackItem | null>(
        params: RollContextParams<TStatistic, TItem>
    ): Promise<RollContext<this, TStatistic, TItem>>;
    override async getRollContext(params: RollContextParams): Promise<RollContext<this>> {
        const context = await super.getRollContext(params);
        if (params.statistic instanceof StatisticModifier && context.self.item?.isOfType("weapon")) {
            PCStrikeAttackTraits.adjustWeapon(context.self.item);
        }

        return context;
    }

    /** Create attack-roll modifiers from weapon traits */
    override getCheckContext<TStatistic extends StatisticCheck | StrikeData, TItem extends AttackItem | null>(
        params: CheckContextParams<TStatistic, TItem>
    ): Promise<CheckContext<this, TStatistic, TItem>>;
    override async getCheckContext(params: CheckContextParams): Promise<CheckContext<this>> {
        const context = await super.getCheckContext(params);
        if (params.statistic instanceof StatisticModifier && context.self.item?.isOfType("weapon")) {
            const fromTraits = PCStrikeAttackTraits.createAttackModifiers({
                weapon: context.self.item,
                domains: params.domains,
            });
            context.self.modifiers.push(...fromTraits);
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
        options: CreatureUpdateContext<TParent>,
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
                            !current.some((currentFeature) => currentFeature.sourceId === feature.flags.core?.sourceId)
                    )
                    .map((i) => i.toObject());
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

interface CharacterPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null>
    extends CreaturePF2e<TParent> {
    flags: CharacterFlags;
    readonly _source: CharacterSource;
    system: CharacterSystemData;
}

export { CharacterPF2e };
