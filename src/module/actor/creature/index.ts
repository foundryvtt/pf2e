import { ActorPF2e } from "@actor";
import { CreatureData, SaveType } from "@actor/data";
import {
    CheckModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    MODIFIER_TYPE,
    RawModifier,
    StatisticModifier,
} from "@actor/modifiers";
import { ItemPF2e, ArmorPF2e, ConditionPF2e, PhysicalItemPF2e } from "@item";
import { RuleElementSynthetics } from "@module/rules";
import { ActiveEffectPF2e } from "@module/active-effect";
import { CheckPF2e, CheckRollContext } from "@system/rolls";
import {
    CreatureSkills,
    CreatureSpeeds,
    InitiativeRollParams,
    InitiativeRollResult,
    LabeledSpeed,
    MovementType,
    SenseData,
    VisionLevel,
    VisionLevels,
} from "./data";
import { LightLevels } from "@module/scene/data";
import { Statistic } from "@system/statistic";
import { ErrorPF2e, objectHasKey, traitSlugToObject } from "@util";
import { PredicatePF2e, RawPredicate } from "@system/predication";
import { UserPF2e } from "@module/user";
import { SKILL_DICTIONARY } from "@actor/data/values";
import { CreatureSensePF2e } from "./sense";
import { CombatantPF2e } from "@module/encounter";
import { HitPointsSummary } from "@actor/base";
import { Rarity, SIZES, SIZE_SLUGS } from "@module/data";
import { extractModifiers, extractRollTwice } from "@module/rules/util";
import { DamageType } from "@system/damage";
import { StrikeData } from "@actor/data/base";
import {
    Alignment,
    AlignmentTrait,
    AttackItem,
    AttackRollContext,
    GetReachParameters,
    IsFlatFootedParams,
    StrikeRollContext,
    StrikeRollContextParams,
} from "./types";
import { EquippedData, ItemCarryType } from "@item/physical/data";
import { isCycle } from "@item/container/helpers";
import { isEquipped } from "@item/physical/usage";
import { ArmorSource } from "@item/data";
import { SIZE_TO_REACH } from "./values";
import { ActionTrait } from "@item/action/data";

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class CreaturePF2e extends ActorPF2e {
    /** Saving throw rolls for the creature, built during data prep */
    override saves!: Record<SaveType, Statistic>;

    /** Skill `Statistic`s for the creature */
    get skills(): CreatureSkills {
        return Object.entries(this.data.data.skills).reduce((current, [shortForm, skill]) => {
            if (!objectHasKey(this.data.data.skills, shortForm)) return current;
            const longForm = skill.name;
            const skillName = game.i18n.localize(skill.label ?? CONFIG.PF2E.skills[shortForm]) || skill.name;
            const domains = ["all", "skill-check", longForm, `${skill.ability}-based`, `${skill.ability}-skill-check`];

            current[longForm] = new Statistic(this, {
                slug: longForm,
                label: skillName,
                proficient: skill.visible,
                domains,
                check: { adjustments: skill.adjustments, type: "skill-check" },
                dc: {},
                modifiers: [...skill.modifiers],
                notes: skill.notes,
            });

            if (shortForm !== longForm) {
                Object.defineProperty(current, shortForm, {
                    get: () => {
                        console.warn(
                            `Short-form skill abbreviations such as actor.skills.${shortForm} are deprecated.`,
                            `Use actor.skills.${longForm} instead.`
                        );
                        return current[longForm];
                    },
                });
            }

            return current;
        }, {} as CreatureSkills);
    }

    /** The creature's position on the alignment axes */
    get alignment(): Alignment {
        return this.data.data.details.alignment.value;
    }

    get rarity(): Rarity {
        return this.data.data.traits.rarity;
    }

    /**
     * A currently naive measurement of this creature's reach
     * @param [context.action] The action context of the reach measurement. Interact actions don't consider weapons.
     * @param [context.weapon] The "weapon," literal or otherwise, used in an attack-reach measurement
     */
    override getReach({ action = "interact", weapon = null }: GetReachParameters = {}): number {
        const baseReach = this.attributes.reach.general;

        if (action === "interact" || this.data.type === "familiar") {
            return baseReach;
        } else {
            const attacks: Pick<StrikeData, "item" | "ready">[] = weapon
                ? [{ item: weapon, ready: true }]
                : this.data.data.actions;
            const readyAttacks = attacks.filter((a) => a.ready);
            const traitsFromWeapons = readyAttacks.flatMap((a): Set<string> | never[] => a.item?.traits ?? []);
            if (traitsFromWeapons.length === 0) return baseReach;

            const reaches = traitsFromWeapons.map((traits): number => {
                if (traits.has("reach")) return baseReach + 5;

                const reachNPattern = /^reach-\d{1,3}$/;
                return Number([...traits].find((t) => reachNPattern.test(t))?.replace("reach-", "")) || baseReach;
            });

            return Math.max(...reaches);
        }
    }

    override get visionLevel(): VisionLevel {
        const senses = this.data.data.traits.senses;
        const senseTypes = senses
            .map((sense) => sense.type)
            .filter((senseType) => ["lowLightVision", "darkvision"].includes(senseType));
        return this.getCondition("blinded")
            ? VisionLevels.BLINDED
            : senseTypes.includes("darkvision")
            ? VisionLevels.DARKVISION
            : senseTypes.includes("lowLightVision")
            ? VisionLevels.LOWLIGHT
            : VisionLevels.NORMAL;
    }

    get hasDarkvision(): boolean {
        return this.visionLevel === VisionLevels.DARKVISION && !this.hasCondition("blinded");
    }

    get hasLowLightVision(): boolean {
        return this.visionLevel >= VisionLevels.LOWLIGHT && !this.hasCondition("blinded");
    }

    override get canSee(): boolean {
        if (!canvas.scene) return true;
        if (this.visionLevel === VisionLevels.BLINDED) return false;

        const lightLevel = canvas.scene.lightLevel;
        return lightLevel > LightLevels.DARKNESS || this.hasDarkvision;
    }

    override get canAct(): boolean {
        // Accomodate eidolon play with the Companion Compendia module (typically is run with zero hit points)
        const traits = this.data.data.traits.traits.value;
        const aliveOrEidolon = this.hitPoints.value > 0 || traits.some((t) => t === "eidolon");

        const conditions = this.itemTypes.condition;
        const cannotAct = ["paralyzed", "stunned", "unconscious"];

        return aliveOrEidolon && !conditions.some((c) => cannotAct.includes(c.slug));
    }

    override get canAttack(): boolean {
        return this.type !== "familiar" && this.canAct;
    }

    get isDead(): boolean {
        const deathIcon = game.settings.get("pf2e", "deathIcon");
        const tokens = this.getActiveTokens(false, true);
        const hasDeathOverlay = tokens.length > 0 && tokens.every((t) => t.data.overlayEffect === deathIcon);
        return (this.hitPoints.value === 0 || hasDeathOverlay) && !this.hasCondition("dying");
    }

    get isSpellcaster(): boolean {
        const { itemTypes } = this;
        return itemTypes.spellcastingEntry.length > 0 && itemTypes.spell.length > 0;
    }

    get perception(): Statistic {
        const stat = this.data.data.attributes.perception as StatisticModifier;
        return Statistic.from(this, stat, "perception", "PF2E.PerceptionCheck", "perception-check");
    }

    get wornArmor(): Embedded<ArmorPF2e> | null {
        return this.itemTypes.armor.find((armor) => armor.isEquipped && armor.isArmor) ?? null;
    }

    /** Get the held shield of most use to the wielder */
    override get heldShield(): Embedded<ArmorPF2e> | null {
        const heldShields = this.itemTypes.armor.filter((armor) => armor.isEquipped && armor.isShield);
        return heldShields.length === 0
            ? null
            : heldShields.slice(0, -1).reduce((bestShield, shield) => {
                  if (bestShield === shield) return bestShield;

                  const withBetterAC =
                      bestShield.acBonus > shield.acBonus
                          ? bestShield
                          : shield.acBonus > bestShield.acBonus
                          ? shield
                          : null;
                  const withMoreHP =
                      bestShield.hitPoints.value > shield.hitPoints.value
                          ? bestShield
                          : shield.hitPoints.value > bestShield.hitPoints.value
                          ? shield
                          : null;
                  const withBetterHardness =
                      bestShield.hardness > shield.hardness
                          ? bestShield
                          : shield.hardness > bestShield.hardness
                          ? shield
                          : null;

                  return withBetterAC ?? withMoreHP ?? withBetterHardness ?? bestShield;
              }, heldShields.slice(-1)[0]);
    }

    /** Whether this actor is an ally of the provided actor */
    override isAllyOf(actor: ActorPF2e): boolean {
        const thisAlliance = this.data.data.details.alliance;

        if (thisAlliance === null) return false;

        const otherAlliance =
            actor instanceof CreaturePF2e
                ? actor.data.data.details.alliance
                : actor.hasPlayerOwner
                ? "party"
                : "opposition";

        return thisAlliance === otherAlliance;
    }

    /** Whether the actor is flat-footed in the current scene context: currently only handles flanking */
    isFlatFooted({ dueTo }: IsFlatFootedParams): boolean {
        // The first data preparation round will occur before the game is ready
        if (!game.ready) return false;

        if (dueTo === "flanking") {
            const { flanking } = this.attributes;
            if (!flanking.flankable) return false;

            const rollOptions = this.getRollOptions();
            if (typeof flanking.flatFootable === "number") {
                flanking.flatFootable = !PredicatePF2e.test(
                    { any: [{ lte: ["origin:level", flanking.flatFootable] }] },
                    rollOptions
                );
            }

            return flanking.flatFootable && PredicatePF2e.test({ all: ["origin:flanking"] }, rollOptions);
        }

        return false;
    }

    /** Construct a range penalty for this creature when making a ranged attack */
    protected getRangePenalty(
        increment: number | null,
        selectors: string[],
        rollOptions: string[]
    ): ModifierPF2e | null {
        if (!increment || increment === 1) return null;
        const slug = "range-penalty";
        const modifier = new ModifierPF2e({
            label: "PF2E.RangePenalty",
            slug,
            type: MODIFIER_TYPE.UNTYPED,
            modifier: Math.max((increment - 1) * -2, -12), // Max range penalty before automatic failure
            predicate: { not: ["ignore-range-penalty", { gte: ["ignore-range-penalty", increment] }] },
            adjustments: this.getModifierAdjustments(selectors, slug),
        });
        modifier.test(rollOptions);
        return modifier;
    }

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();

        const attributes = this.data.data.attributes;
        attributes.hp = mergeObject(attributes.hp ?? {}, { negativeHealing: false });
        attributes.hardness ??= { value: 0 };
        attributes.flanking.canFlank = true;
        attributes.flanking.flankable = true;
        attributes.flanking.flatFootable = true;
        attributes.reach = { general: 0, manipulate: 0 };

        if ("initiative" in attributes) {
            attributes.initiative.tiebreakPriority = this.hasPlayerOwner ? 2 : 1;
        }

        // Bless raw custom modifiers as `ModifierPF2e`s
        const customModifiers = (this.data.data.customModifiers ??= {});
        for (const selector of Object.keys(customModifiers)) {
            customModifiers[selector] = customModifiers[selector].map(
                (rawModifier: RawModifier) => new ModifierPF2e(rawModifier)
            );
        }

        // Set base actor-shield data for PCs NPCs
        if (this.isOfType("character", "npc")) {
            this.data.data.attributes.shield = {
                itemId: null,
                name: game.i18n.localize("PF2E.ArmorTypeShield"),
                ac: 0,
                hp: { value: 0, max: 0 },
                brokenThreshold: 0,
                hardness: 0,
                raised: false,
                broken: false,
                destroyed: false,
                icon: "systems/pf2e/icons/actions/raise-a-shield.webp",
            };
        }

        // Toggles
        const flatFootedOption = "target:condition:flat-footed";
        this.data.data.toggles = [
            {
                label: "PF2E.TargetFlatFootedLabel",
                domain: "all",
                option: flatFootedOption,
                checked: !!this.rollOptions.all[flatFootedOption],
                enabled: true,
            },
        ];
    }

    /** Apply ActiveEffect-Like rule elements immediately after application of actual `ActiveEffect`s */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();

        for (const rule of this.rules) {
            rule.onApplyActiveEffects?.();
        }

        for (const changeEntries of Object.values(this.data.data.autoChanges)) {
            changeEntries!.sort((a, b) => (Number(a.level) > Number(b.level) ? 1 : -1));
        }

        this.rollOptions.all[`self:mode:${this.modeOfBeing}`] = true;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        // Set minimum reach according to creature size
        const { attributes } = this;
        const reachFromSize = SIZE_TO_REACH[this.size];
        attributes.reach.general = Math.max(attributes.reach.general, reachFromSize);
        attributes.reach.manipulate = Math.max(attributes.reach.manipulate, attributes.reach.general, reachFromSize);

        // Add alignment traits from the creature's alignment
        const alignmentTraits = ((): AlignmentTrait[] => {
            const { alignment } = this;
            return [
                ["LG", "NG", "CG"].includes(alignment) ? ("good" as const) : [],
                ["LE", "NE", "CE"].includes(alignment) ? ("evil" as const) : [],
                ["LG", "LN", "LE"].includes(alignment) ? ("lawful" as const) : [],
                ["CG", "CN", "CE"].includes(alignment) ? ("chaotic" as const) : [],
            ].flat();
        })();
        const { rollOptions } = this;
        for (const trait of alignmentTraits) {
            this.data.data.traits.traits.value.push(trait);
            rollOptions.all[`self:trait:${trait}`] = true;
        }

        // Other creature-specific self: roll options
        if (this.isSpellcaster) {
            rollOptions.all["self:caster"] = true;
        }

        if (this.hitPoints.negativeHealing) rollOptions.all["self:negative-healing"];

        // Set whether this actor is wearing armor
        rollOptions.all["self:armored"] = !!this.wornArmor && this.wornArmor.category !== "unarmored";

        this.prepareSynthetics();

        const sizeIndex = SIZES.indexOf(this.size);
        const sizeSlug = SIZE_SLUGS[sizeIndex];
        rollOptions.all[`self:size:${sizeIndex}`] = true;
        rollOptions.all[`self:size:${sizeSlug}`] = true;

        // Add modifiers from being flanked
        if (this.isFlatFooted({ dueTo: "flanking" })) {
            const name = game.i18n.localize("PF2E.Item.Condition.Flanked");
            const condition = game.pf2e.ConditionManager.getCondition("flat-footed", { name });
            const flatFooted = new ConditionPF2e(condition.toObject(), { parent: this }) as Embedded<ConditionPF2e>;

            const rule = flatFooted.prepareRuleElements().shift();
            if (!rule) throw ErrorPF2e("Unexpected error retrieving condition");
            rule.beforePrepareData?.();

            this.rollOptions.all["self:condition:flat-footed"] = true;
            this.rollOptions.all["self:flatFooted"] = true; // legacy support
        }
    }

    protected prepareInitiative(): void {
        if (!(this.data.type === "character" || this.data.type === "npc")) return;

        const systemData = this.data.data;
        const checkType = systemData.attributes.initiative.ability || "perception";

        const [ability, initStat, proficiency, proficiencyLabel] =
            checkType === "perception"
                ? (["wis", systemData.attributes.perception, "perception", "PF2E.PerceptionLabel"] as const)
                : ([
                      systemData.skills[checkType]?.ability ?? "int",
                      systemData.skills[checkType],
                      SKILL_DICTIONARY[checkType],
                      CONFIG.PF2E.skills[checkType],
                  ] as const);

        const { statisticsModifiers, rollNotes } = this.synthetics;
        const domains = ["all", "initiative", `${ability}-based`, proficiency];
        const modifiers = extractModifiers(statisticsModifiers, domains, {
            test: [proficiency, ...this.getRollOptions(domains)],
        });
        const notes = rollNotes.initiative?.map((n) => n.clone()) ?? [];
        const label = game.i18n.format("PF2E.InitiativeWithSkill", { skillName: game.i18n.localize(proficiencyLabel) });
        const stat = mergeObject(new CheckModifier("initiative", initStat, modifiers), {
            ability: checkType,
            label,
            tiebreakPriority: this.data.data.attributes.initiative.tiebreakPriority,
            roll: async (args: InitiativeRollParams): Promise<InitiativeRollResult | null> => {
                if (!("initiative" in this.data.data.attributes)) return null;
                const rollOptions = Array.from(
                    new Set([...this.getRollOptions(domains), ...(args.options ?? []), proficiency])
                );

                if (this.data.type === "character") ensureProficiencyOption(rollOptions, initStat.rank ?? -1);

                // Get or create the combatant
                const combatant = await (async (): Promise<Embedded<CombatantPF2e> | null> => {
                    if (!game.combat) {
                        ui.notifications.error(game.i18n.localize("PF2E.Encounter.NoActiveEncounter"));
                        return null;
                    }
                    const token = this.getActiveTokens().pop();
                    const existing = game.combat.combatants.find((combatant) => combatant.actor === this);
                    if (existing) {
                        return existing;
                    } else if (token) {
                        await token.toggleCombat(game.combat);
                        return token.combatant ?? null;
                    } else {
                        ui.notifications.error(game.i18n.format("PF2E.Encounter.NoTokenInScene", { actor: this.name }));
                        return null;
                    }
                })();
                if (!combatant) return null;

                const rollTwice = extractRollTwice(this.synthetics.rollTwice, domains, rollOptions);
                const context: CheckRollContext = {
                    actor: this,
                    type: "initiative",
                    options: rollOptions,
                    notes,
                    dc: args.dc,
                    rollTwice,
                    skipDialog: args.skipDialog,
                };
                if (combatant.hidden) {
                    context.rollMode = CONST.DICE_ROLL_MODES.PRIVATE;
                }

                const roll = await CheckPF2e.roll(
                    new CheckModifier(label, systemData.attributes.initiative, args.modifiers),
                    context,
                    args.event
                );
                if (!roll) return null;

                for (const rule of this.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions });
                }

                // Update the tracker unless requested not to
                const updateTracker = args.updateTracker ?? true;
                if (updateTracker) {
                    game.combat?.setInitiative(combatant.id, roll.total);
                }

                return { combatant, roll };
            },
        });

        systemData.attributes.initiative = stat;
    }

    protected override prepareSynthetics(): void {
        super.prepareSynthetics();
        const { customModifiers } = this.data.data;

        // Custom modifiers
        const { statisticsModifiers } = this.synthetics;
        for (const [selector, modifiers] of Object.entries(customModifiers)) {
            const syntheticModifiers = (statisticsModifiers[selector] ??= []);
            syntheticModifiers.push(
                ...modifiers.map((modifier) => () => {
                    modifier.adjustments = this.getModifierAdjustments([selector], modifier.slug);
                    return modifier;
                })
            );
        }
    }

    /** Add a circumstance bonus if this creature has a raised shield */
    protected getShieldBonus(): ModifierPF2e | null {
        if (!(this.data.type === "character" || this.data.type === "npc")) return null;
        const shieldData = this.data.data.attributes.shield;
        if (shieldData.raised && !shieldData.broken) {
            const slug = "raised-shield";
            this.rollOptions.all["self:shield:raised"] = true;
            return new ModifierPF2e({
                label: shieldData.name,
                slug,
                adjustments: this.getModifierAdjustments(["ac"], slug),
                type: MODIFIER_TYPE.CIRCUMSTANCE,
                modifier: shieldData.ac,
            });
        }

        return null;
    }

    /**
     * Changes the carry type of an item (held/worn/stowed/etc) and/or regrips/reslots
     * @param item       The item
     * @param carryType  Location to be set to
     * @param handsHeld  Number of hands being held
     * @param inSlot     Whether the item is in the slot or not. Equivilent to "equipped" previously
     */
    async adjustCarryType(
        item: Embedded<PhysicalItemPF2e>,
        carryType: ItemCarryType,
        handsHeld = 0,
        inSlot = false
    ): Promise<void> {
        const { usage } = item.data.data;
        if (carryType === "stowed") {
            const container = item.actor.itemTypes.backpack.find((c) => c !== item.container && !isCycle(item, c));
            if (container) await item.actor.stowOrUnstow(item, container);
        } else {
            const equipped: EquippedData = {
                carryType: carryType,
                handsHeld: carryType === "held" ? handsHeld : 0,
                inSlot: usage.type === "worn" && usage.where ? inSlot : undefined,
            };

            const updates: (DeepPartial<ArmorSource> & { _id: string })[] = [];

            if (isEquipped(usage, equipped) && item instanceof ArmorPF2e && item.isArmor) {
                // see if they have another set of armor equipped
                const wornArmors = this.itemTypes.armor.filter((a) => a !== item && a.isEquipped && a.isArmor);
                for (const armor of wornArmors) {
                    updates.push({ _id: armor.id, data: { equipped: { inSlot: false } } });
                }
            }

            updates.push({ _id: item.id, data: { containerId: null, equipped: equipped } });

            await this.updateEmbeddedDocuments("Item", updates);
        }
    }

    /**
     * Adds a custom modifier that will be included when determining the final value of a stat. The slug generated by
     * the name parameter must be unique for the custom modifiers for the specified stat, or it will be ignored.
     */
    async addCustomModifier(
        stat: string,
        name: string,
        value: number,
        type: string,
        predicate?: RawPredicate,
        damageType?: DamageType,
        damageCategory?: string
    ): Promise<void> {
        const customModifiers = duplicate(this.data.data.customModifiers ?? {});
        if (!(customModifiers[stat] ?? []).find((m) => m.label === name)) {
            const modifier = new ModifierPF2e({ label: name, modifier: value, type });
            if (damageType) {
                modifier.damageType = damageType;
            }
            if (damageCategory) {
                modifier.damageCategory = damageCategory;
            }
            modifier.custom = true;

            // modifier predicate
            modifier.predicate = predicate instanceof PredicatePF2e ? predicate : new PredicatePF2e(predicate);
            modifier.ignored = !modifier.predicate.test([]);

            customModifiers[stat] = (customModifiers[stat] ?? []).concat([modifier]);
            await this.update({ "data.customModifiers": customModifiers });
        }
    }

    /** Removes a custom modifier by slug */
    async removeCustomModifier(stat: string, modifier: number | string): Promise<void> {
        const customModifiers = duplicate(this.data.data.customModifiers ?? {});
        if (typeof modifier === "number" && customModifiers[stat] && customModifiers[stat].length > modifier) {
            customModifiers[stat].splice(modifier, 1);
            await this.update({ "data.customModifiers": customModifiers });
        } else if (typeof modifier === "string" && customModifiers[stat]) {
            customModifiers[stat] = customModifiers[stat].filter((m) => m.slug !== modifier);
            await this.update({ "data.customModifiers": customModifiers });
        } else {
            throw ErrorPF2e("Custom modifiers can only be removed by slug (string) or index (number)");
        }
    }

    /** Prepare derived creature senses from Rules Element synthetics */
    prepareSenses(data: SenseData[], synthetics: RuleElementSynthetics): CreatureSensePF2e[] {
        const preparedSenses = data.map((datum) => new CreatureSensePF2e(datum));

        for (const { sense, predicate, force } of synthetics.senses) {
            if (predicate && !predicate.test(this.getRollOptions(["all", "sense"]))) continue;
            const existing = preparedSenses.find((oldSense) => oldSense.type === sense.type);
            if (!existing) {
                preparedSenses.push(sense);
            } else if (force) {
                preparedSenses.findSplice((oldSense) => oldSense === existing, sense);
            } else {
                if (sense.isMoreAcuteThan(existing)) existing.acuity = sense.acuity;
                if (sense.hasLongerRangeThan(existing)) existing.value = sense.value;
            }
        }

        return preparedSenses;
    }

    prepareSpeed(movementType: "land"): CreatureSpeeds;
    prepareSpeed(movementType: Exclude<MovementType, "land">): LabeledSpeed & StatisticModifier;
    prepareSpeed(movementType: MovementType): CreatureSpeeds | (LabeledSpeed & StatisticModifier);
    prepareSpeed(movementType: MovementType): CreatureSpeeds | (LabeledSpeed & StatisticModifier) {
        const systemData = this.data.data;
        const selectors = ["speed", `${movementType}-speed`];
        const domains = ["all", ...selectors];
        const rollOptions = this.getRollOptions(domains);
        const modifiers = extractModifiers(this.synthetics.statisticsModifiers, selectors);

        if (movementType === "land") {
            const label = game.i18n.localize("PF2E.SpeedTypesLand");
            const base = Number(systemData.attributes.speed.value ?? 0);
            const statLabel = game.i18n.format("PF2E.SpeedLabel", { type: label });
            const stat = mergeObject(
                new StatisticModifier(statLabel, modifiers, rollOptions),
                systemData.attributes.speed,
                { overwrite: false }
            );
            stat.total = base + stat.totalModifier;
            stat.type = "land";
            stat.breakdown = [`${game.i18n.format("PF2E.SpeedBaseLabel", { type: label })} ${base}`]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                )
                .join(", ");
            return stat;
        } else {
            const speed = systemData.attributes.speed.otherSpeeds.find(
                (otherSpeed) => otherSpeed.type === movementType
            );
            if (!speed) throw ErrorPF2e("Unexpected missing speed");

            speed.label = game.i18n.localize(game.i18n.localize(CONFIG.PF2E.speedTypes[speed.type]));
            const base = Number(speed.value ?? 0);
            const statLabel = game.i18n.format("PF2E.SpeedLabel", { type: speed.label });
            const stat = mergeObject(new StatisticModifier(statLabel, modifiers, rollOptions), speed, {
                overwrite: false,
            });
            stat.total = base + stat.totalModifier;
            stat.breakdown = [`${game.i18n.format("PF2E.SpeedBaseLabel", { type: speed.label })} ${base}`]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                )
                .join(", ");
            return stat;
        }
    }

    /** Create a deep copy of a synthetics record of the form Record<string, object[]> */
    protected cloneSyntheticsRecord<T extends { clone(): T }>(record: Record<string, T[]>): Record<string, T[]> {
        return Object.fromEntries(
            Object.entries(record).map(([key, synthetics]) => [key, synthetics.map((s) => s.clone())])
        );
    }

    /* -------------------------------------------- */
    /*  Rolls                                       */
    /* -------------------------------------------- */

    /**
     * Calculates attack roll target data including the target's DC.
     * All attack rolls have the "all" and "attack-roll" domains and the "attack" trait,
     * but more can be added via the options.
     */
    getAttackRollContext<I extends AttackItem>(params: StrikeRollContextParams<I>): AttackRollContext<this, I> {
        params.domains ??= [];
        const rollDomains = ["all", "attack-roll", params.domains ?? []].flat();
        const context = this.getStrikeRollContext({ ...params, domains: rollDomains });
        const targetActor = context.target?.actor;

        return {
            ...context,
            dc: targetActor?.attributes.ac
                ? {
                      scope: "attack",
                      slug: "ac",
                      value: targetActor.attributes.ac.value,
                  }
                : null,
        };
    }

    protected getDamageRollContext<I extends AttackItem>(
        params: StrikeRollContextParams<I>
    ): StrikeRollContext<this, I> {
        const context = this.getStrikeRollContext({ ...params, domains: ["all", "damage-roll"] });
        return {
            ...context,
            options: Array.from(new Set(context.options)),
        };
    }

    protected getStrikeRollContext<I extends AttackItem>(
        params: StrikeRollContextParams<I>
    ): StrikeRollContext<this, I> {
        const targets = Array.from(game.user.targets).filter((token) => token.actor instanceof CreaturePF2e);
        const targetToken = targets.length === 1 && targets[0].actor instanceof CreaturePF2e ? targets[0] : null;

        const selfToken =
            canvas.tokens.controlled.find((t) => t.actor === this) ?? this.getActiveTokens().shift() ?? null;
        const reach = !params.item.isOfType("spell")
            ? this.getReach({ action: "attack", weapon: params.item })
            : undefined;

        const selfOptions = this.getRollOptions(params.domains ?? []);
        if (targetToken && selfToken?.isFlanking(targetToken, { reach })) {
            selfOptions.push("self:flanking");
        }

        const selfActor = params.viewOnly ? this : this.getContextualClone(selfOptions);
        const actions: StrikeData[] = selfActor.data.data.actions?.flatMap((a) => [a, a.altUsages ?? []].flat()) ?? [];

        const selfItem =
            params.viewOnly || params.item.isOfType("spell")
                ? params.item
                : actions
                      .map((a): AttackItem => a.item)
                      .find((weapon): weapon is I => {
                          // Find the matching weapon or melee item
                          if (!(params.item.id === weapon.id && weapon.name === params.item.name)) return false;
                          if (params.item.isOfType("melee") && weapon.isOfType("melee")) return true;

                          // Discriminate between melee/thrown usages by checking that both are either melee or ranged
                          return (
                              params.item.isOfType("weapon") &&
                              weapon.isOfType("weapon") &&
                              params.item.isMelee === weapon.isMelee
                          );
                      }) ?? params.item;

        const traitSlugs: ActionTrait[] = ["attack" as const];
        for (const adjustment of this.synthetics.strikeAdjustments) {
            if (selfItem.isOfType("weapon", "melee")) {
                adjustment.adjustTraits?.(selfItem, traitSlugs);
            }
        }
        const traits = traitSlugs.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits));

        // Clone the actor to recalculate its AC with contextual roll options
        const targetActor = params.viewOnly
            ? null
            : targetToken?.actor?.getContextualClone([...selfActor.getSelfRollOptions("origin")]) ?? null;

        // Target roll options
        const targetOptions = targetActor?.getSelfRollOptions("target") ?? [];
        const rollOptions = Array.from(
            new Set([
                ...selfOptions,
                ...targetOptions,
                // Backward compatibility for predication looking for an "attack" trait by its lonesome
                "attack",
            ])
        );

        // Calculate distance and set as a roll option
        const distance = selfToken && targetToken && !!canvas.grid ? selfToken.distanceTo(targetToken) : null;
        rollOptions.push(`target:distance:${distance}`);

        const self = {
            actor: selfActor,
            token: selfToken?.document ?? null,
            item: selfItem,
            modifiers: [],
        };

        const target =
            targetActor && targetToken && distance !== null
                ? { actor: targetActor, token: targetToken.document, distance }
                : null;

        return {
            options: Array.from(new Set(rollOptions)),
            self,
            target,
            traits,
        };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentUpdateContext<this>,
        user: UserPF2e
    ): Promise<void> {
        // Clamp hit points
        const hitPoints = changed.data?.attributes?.hp;
        if (typeof hitPoints?.value === "number") {
            hitPoints.value = Math.clamped(hitPoints.value, 0, this.hitPoints.max);
        }

        // Clamp focus points
        const focus = changed.data && "resources" in changed.data ? changed.data?.resources?.focus ?? null : null;
        if (focus && "resources" in this.data.data) {
            if (typeof focus.max === "number") {
                focus.max = Math.clamped(focus.max, 0, 3);
            }

            const currentPoints = focus.value ?? this.data.data.resources.focus?.value ?? 0;
            const currentMax = focus.max ?? this.data.data.resources.focus?.max ?? 0;
            focus.value = Math.clamped(currentPoints, 0, currentMax);
        }

        await super._preUpdate(changed, options, user);
    }
}

export interface CreaturePF2e {
    readonly data: CreatureData;

    get hitPoints(): HitPointsSummary;

    /** See implementation in class */
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        updateData: EmbeddedDocumentUpdateData<this>[],
        options?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[]>;
    updateEmbeddedDocuments(
        embeddedName: "Item",
        updateData: EmbeddedDocumentUpdateData<this>[],
        options?: DocumentModificationContext
    ): Promise<ItemPF2e[]>;
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        updateData: EmbeddedDocumentUpdateData<this>[],
        options?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;
}
