import { ActorPF2e } from "@actor";
import { HitPointsSummary } from "@actor/base";
import { CreatureData } from "@actor/data";
import { StrikeData } from "@actor/data/base";
import {
    CheckModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    MODIFIER_TYPE,
    MODIFIER_TYPES,
    RawModifier,
    StatisticModifier,
} from "@actor/modifiers";
import { SaveType } from "@actor/types";
import { SKILL_DICTIONARY } from "@actor/values";
import { ArmorPF2e, ConditionPF2e, ItemPF2e, PhysicalItemPF2e } from "@item";
import { isCycle } from "@item/container/helpers";
import { ArmorSource } from "@item/data";
import { EquippedData, ItemCarryType } from "@item/physical/data";
import { isEquipped } from "@item/physical/usage";
import { ActiveEffectPF2e } from "@module/active-effect";
import { Rarity, SIZES, SIZE_SLUGS } from "@module/data";
import { CombatantPF2e } from "@module/encounter";
import { RollNotePF2e } from "@module/notes";
import { RuleElementSynthetics } from "@module/rules";
import {
    extractModifierAdjustments,
    extractModifiers,
    extractRollTwice,
    extractRollSubstitutions,
} from "@module/rules/util";
import { LightLevels } from "@module/scene/data";
import { UserPF2e } from "@module/user";
import { CheckPF2e, CheckRoll, CheckRollContext } from "@system/check";
import { DamageType } from "@system/damage";
import { CheckDC } from "@system/degree-of-success";
import { LocalizePF2e } from "@system/localize";
import { PredicatePF2e, RawPredicate } from "@system/predication";
import { Statistic } from "@system/statistic";
import { ErrorPF2e, objectHasKey, setHasElement } from "@util";
import {
    CreatureSkills,
    CreatureSpeeds,
    CreatureTrait,
    InitiativeRollParams,
    InitiativeRollResult,
    LabeledSpeed,
    MovementType,
    SenseData,
    SkillData,
    UnlabeledSpeed,
    VisionLevel,
    VisionLevels,
} from "./data";
import { CreatureSensePF2e } from "./sense";
import { Alignment, AlignmentTrait, CreatureUpdateContext, GetReachParameters, IsFlatFootedParams } from "./types";
import { SIZE_TO_REACH } from "./values";

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
abstract class CreaturePF2e extends ActorPF2e {
    /** Skill `Statistic`s for the creature */
    get skills(): CreatureSkills {
        return Object.entries(this.system.skills).reduce((current, [shortForm, skill]: [string, SkillData]) => {
            if (!objectHasKey(this.system.skills, shortForm)) return current;
            const longForm = skill.slug;
            const skillName = game.i18n.localize(skill.label ?? CONFIG.PF2E.skills[shortForm]) || skill.slug;
            const domains = ["all", "skill-check", longForm, `${skill.ability}-based`, `${skill.ability}-skill-check`];
            if (skill.lore) domains.push("lore-skill-check");

            current[longForm] = new Statistic(this, {
                slug: longForm,
                label: skillName,
                lore: !!skill.lore,
                proficient: skill.visible,
                domains,
                check: { type: "skill-check" },
                modifiers: [...skill.modifiers],
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
        return this.system.details.alignment.value;
    }

    get rarity(): Rarity {
        return this.system.traits.rarity;
    }

    /**
     * A currently naive measurement of this creature's reach
     * @param [context.action] The action context of the reach measurement. Interact actions don't consider weapons.
     * @param [context.weapon] The "weapon," literal or otherwise, used in an attack-reach measurement
     */
    override getReach({ action = "interact", weapon = null }: GetReachParameters = {}): number {
        const baseReach = this.attributes.reach.general;

        if (action === "interact" || this.type === "familiar") {
            return baseReach;
        } else {
            const attacks: Pick<StrikeData, "item" | "ready">[] = weapon
                ? [{ item: weapon, ready: true }]
                : this.system.actions ?? [];
            const readyAttacks = attacks.filter((a) => a.ready);
            const traitsFromWeapons = readyAttacks.map((a) => a.item.traits);
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
        const senses = this.system.traits.senses;
        if (!Array.isArray(senses)) return VisionLevels.NORMAL;

        const senseTypes = new Set(senses.map((sense) => sense.type));

        return this.getCondition("blinded")
            ? VisionLevels.BLINDED
            : senseTypes.has("darkvision") || senseTypes.has("greaterDarkvision")
            ? VisionLevels.DARKVISION
            : senseTypes.has("lowLightVision")
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
        const traits = this.system.traits.value;
        const aliveOrEidolon = !this.isDead || traits.some((t) => t === "eidolon");

        return aliveOrEidolon && !this.hasCondition("paralyzed", "stunned", "unconscious");
    }

    override get canAttack(): boolean {
        return this.type !== "familiar" && this.canAct;
    }

    override get isDead(): boolean {
        const { hitPoints } = this;
        if (hitPoints.max > 0 && hitPoints.value === 0 && !this.hasCondition("dying", "unconscious")) {
            return true;
        }

        const token = this.token ?? this.getActiveTokens(false, true).shift();
        return !!token?.hasStatusEffect("dead");
    }

    /** Whether the creature emits sound: overridable by AE-like */
    override get emitsSound(): boolean {
        return this.system.attributes.emitsSound;
    }

    get isSpellcaster(): boolean {
        const { itemTypes } = this;
        return itemTypes.spellcastingEntry.length > 0 && itemTypes.spell.length > 0;
    }

    get perception(): Statistic {
        const stat = this.system.attributes.perception as StatisticModifier;
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
                    [{ lte: ["origin:level", flanking.flatFootable] }],
                    rollOptions
                );
            }

            return flanking.flatFootable && PredicatePF2e.test(["origin:flanking"], rollOptions);
        }

        return false;
    }

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();

        const attributes = this.system.attributes;
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
        const customModifiers = (this.system.customModifiers ??= {});
        for (const selector of Object.keys(customModifiers)) {
            customModifiers[selector] = customModifiers[selector].map(
                (rawModifier: RawModifier) => new ModifierPF2e(rawModifier)
            );
        }

        // Set base actor-shield data for PCs NPCs
        if (this.isOfType("character", "npc")) {
            this.system.attributes.shield = {
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
        this.system.toggles = [];

        attributes.doomed = { value: 0, max: 3 };
        attributes.dying = { value: 0, max: 4, recoveryDC: 10 };
        attributes.wounded = { value: 0, max: 3 };
    }

    /** Apply ActiveEffect-Like rule elements immediately after application of actual `ActiveEffect`s */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();

        for (const rule of this.rules) {
            rule.onApplyActiveEffects?.();
        }

        for (const changeEntries of Object.values(this.system.autoChanges)) {
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
            this.system.traits.value.push(trait);
            rollOptions.all[`self:trait:${trait}`] = true;
        }

        // Other creature-specific self: roll options
        if (this.isSpellcaster) {
            rollOptions.all["self:caster"] = true;
        }

        if (this.hitPoints.negativeHealing) {
            rollOptions.all["self:negative-healing"] = true;
        }

        // Set whether this actor is wearing armor
        rollOptions.all["self:armored"] = !!this.wornArmor && this.wornArmor.category !== "unarmored";

        // Set whether this creature emits sound
        this.system.attributes.emitsSound = !this.isDead;

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
        }

        // Handle caps derived from dying
        attributes.wounded.max = Math.max(0, attributes.dying.max - 1);
        attributes.doomed.max = attributes.dying.max;

        // Set dying, doomed, and wounded statuses according to embedded conditions
        for (const conditionName of ["doomed", "wounded", "dying"] as const) {
            const condition = this.itemTypes.condition.find((condition) => condition.slug === conditionName);
            const status = attributes[conditionName];
            if (conditionName === "dying") {
                status.max -= attributes.doomed.value;
            }
            status.value = Math.min(condition?.value ?? 0, status.max);
        }
    }

    protected prepareInitiative(): void {
        if (!this.isOfType("character", "npc")) return;

        const systemData = this.system;
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

        const { rollNotes } = this.synthetics;
        const domains = ["all", "initiative", `${ability}-based`, proficiency];
        const rollOptions = this.getRollOptions(domains);
        const modifiers = extractModifiers(this.synthetics, domains, {
            test: [proficiency, ...rollOptions],
        });
        const notes = rollNotes.initiative?.map((n) => n.clone()) ?? [];
        const label = game.i18n.format("PF2E.InitiativeWithSkill", { skillName: game.i18n.localize(proficiencyLabel) });
        const stat = mergeObject(new CheckModifier("initiative", initStat, modifiers, rollOptions), {
            ability: checkType,
            label,
            tiebreakPriority: systemData.attributes.initiative.tiebreakPriority,
            roll: async (args: InitiativeRollParams): Promise<InitiativeRollResult | null> => {
                if (!("initiative" in this.system.attributes)) return null;
                const rollOptions = new Set([...this.getRollOptions(domains), ...(args.options ?? []), proficiency]);
                if (this.isOfType("character")) {
                    const rank =
                        checkType === "perception"
                            ? this.system.attributes.perception.rank
                            : this.system.skills[checkType].rank;
                    ensureProficiencyOption(rollOptions, rank);
                }

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
                const substitutions = extractRollSubstitutions(this.synthetics.rollSubstitutions, domains, rollOptions);
                const context: CheckRollContext = {
                    actor: this,
                    type: "initiative",
                    options: rollOptions,
                    notes,
                    dc: args.dc,
                    rollTwice,
                    skipDialog: args.skipDialog,
                    rollMode: args.rollMode,
                    substitutions,
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
        const { customModifiers } = this.system;

        // Custom modifiers
        const { statisticsModifiers } = this.synthetics;
        for (const [selector, modifiers] of Object.entries(customModifiers)) {
            const syntheticModifiers = (statisticsModifiers[selector] ??= []);
            syntheticModifiers.push(...modifiers.map((m) => () => m));
        }
    }

    /** Add a circumstance bonus if this creature has a raised shield */
    protected getShieldBonus(): ModifierPF2e | null {
        if (!this.isOfType("character", "npc")) return null;
        const shieldData = this.system.attributes.shield;
        if (shieldData.raised && !shieldData.broken) {
            const slug = "raised-shield";
            this.rollOptions.all["self:shield:raised"] = true;
            return new ModifierPF2e({
                label: shieldData.name,
                slug,
                adjustments: extractModifierAdjustments(
                    this.synthetics.modifierAdjustments,
                    ["all", "dex-based", "ac"],
                    slug
                ),
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
        const { usage } = item.system;
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
                    updates.push({ _id: armor.id, system: { equipped: { inSlot: false } } });
                }
            }

            updates.push({ _id: item.id, system: { containerId: null, equipped: equipped } });

            await this.updateEmbeddedDocuments("Item", updates);
        }
    }

    /**
     * Adds a custom modifier that will be included when determining the final value of a stat. The slug generated by
     * the name parameter must be unique for the custom modifiers for the specified stat, or it will be ignored.
     */
    async addCustomModifier(
        stat: string,
        label: string,
        value: number,
        type: string,
        predicate: RawPredicate = [],
        damageType?: DamageType,
        damageCategory?: string
    ): Promise<void> {
        if (!this.isOfType("character", "npc")) return;
        if (stat.length === 0) throw ErrorPF2e("A custom modifier's statistic must be a non-empty string");
        if (label.length === 0) throw ErrorPF2e("A custom modifier's label must be a non-empty string");

        const customModifiers = this.toObject().system.customModifiers ?? {};
        const modifiers = customModifiers[stat] ?? [];
        if (!modifiers.some((m) => m.label === label)) {
            const modifierType = setHasElement(MODIFIER_TYPES, type) ? type : "untyped";
            const modifier = new ModifierPF2e({
                label,
                modifier: value,
                type: modifierType,
                predicate,
                custom: true,
            }).toObject();
            if (damageType) {
                modifier.damageType = damageType;
            }
            if (damageCategory) {
                modifier.damageCategory = damageCategory;
            }

            await this.update({ [`system.customModifiers.${stat}`]: [...modifiers, modifier] });
        }
    }

    /** Removes a custom modifier by slug */
    async removeCustomModifier(stat: string, slug: string): Promise<void> {
        if (stat.length === 0) throw ErrorPF2e("A custom modifier's statistic must be a non-empty string");

        const customModifiers = this.toObject().system.customModifiers ?? {};
        const modifiers = customModifiers[stat] ?? [];
        if (modifiers.length === 0) return;

        if (typeof slug === "string") {
            const withRemoved = modifiers.filter((m) => m.slug !== slug);
            await this.update({ [`system.customModifiers.${stat}`]: withRemoved });
        } else {
            throw ErrorPF2e("Custom modifiers can only be removed by slug (string) or index (number)");
        }
    }

    /**
     * Roll a Recovery Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     */
    async rollRecovery(event: JQuery.TriggeredEvent): Promise<Rolled<CheckRoll> | null> {
        const { dying } = this.attributes;

        if (!dying?.value) return null;

        const translations = LocalizePF2e.translations.PF2E;
        const { Recovery } = translations;

        // const wounded = this.system.attributes.wounded.value; // not needed currently as the result is currently not automated
        const recoveryDC = dying.recoveryDC;

        const dc: CheckDC = {
            label: game.i18n.format(translations.Recovery.rollingDescription, {
                dying: dying.value,
                dc: "{dc}", // Replace variable with variable, which will be replaced with the actual value in CheckModifiersDialog.Roll()
            }),
            value: recoveryDC + dying.value,
            visible: true,
        };

        const notes = [
            new RollNotePF2e({
                selector: "all",
                text: game.i18n.localize(Recovery.critSuccess),
                outcome: ["criticalSuccess"],
            }),
            new RollNotePF2e({
                selector: "all",
                text: game.i18n.localize(Recovery.success),
                outcome: ["success"],
            }),
            new RollNotePF2e({
                selector: "all",
                text: game.i18n.localize(Recovery.failure),
                outcome: ["failure"],
            }),
            new RollNotePF2e({
                selector: "all",
                text: game.i18n.localize(Recovery.critFailure),
                outcome: ["criticalFailure"],
            }),
        ];

        const modifier = new StatisticModifier(game.i18n.localize(translations.Check.Specific.Recovery), []);
        const token = this.getActiveTokens(false, true).shift();

        return CheckPF2e.roll(modifier, { actor: this, token, dc, notes }, event);
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

    prepareSpeed(movementType: "land"): this["system"]["attributes"]["speed"];
    prepareSpeed(movementType: Exclude<MovementType, "land">): (LabeledSpeed & StatisticModifier) | null;
    prepareSpeed(movementType: MovementType): CreatureSpeeds | (LabeledSpeed & StatisticModifier) | null;
    prepareSpeed(movementType: MovementType): CreatureSpeeds | (LabeledSpeed & StatisticModifier) | null {
        const systemData = this.system;
        const selectors = ["speed", "all-speeds", `${movementType}-speed`];
        const rollOptions = this.getRollOptions(selectors);

        if (movementType === "land") {
            const landSpeed = systemData.attributes.speed;
            landSpeed.value = Number(landSpeed.value) || 0;

            const fromSynthetics = (this.synthetics.movementTypes[movementType] ?? []).map((d) => d() ?? []).flat();
            landSpeed.value = [landSpeed.value, ...fromSynthetics.map((s) => s.value)].sort().pop()!;

            const base = landSpeed.value;
            const modifiers = extractModifiers(this.synthetics, selectors);
            const stat: CreatureSpeeds = mergeObject(
                new StatisticModifier(`${movementType}-speed`, modifiers, rollOptions),
                landSpeed,
                { overwrite: false }
            );
            const typeLabel = game.i18n.localize("PF2E.SpeedTypesLand");
            const statLabel = game.i18n.format("PF2E.SpeedLabel", { type: typeLabel });
            const otherData = {
                type: "land",
                label: statLabel,
                total: base + stat.totalModifier,
                breakdown: [
                    `${game.i18n.format("PF2E.SpeedBaseLabel", { type: typeLabel })} ${landSpeed.value}`,
                    ...stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`),
                ].join(", "),
            };

            return mergeObject(stat, otherData);
        } else {
            const speeds = systemData.attributes.speed;
            const { otherSpeeds } = speeds;
            const existing = otherSpeeds.find((s) => s.type === movementType) ?? [];
            const fromSynthetics = (this.synthetics.movementTypes[movementType] ?? []).map((d) => d() ?? []).flat();
            const fastest: UnlabeledSpeed | null = [existing, fromSynthetics]
                .flat()
                .reduce(
                    (best: UnlabeledSpeed | null, speed) => (!best ? speed : speed?.value > best.value ? speed : best),
                    null
                );
            if (!fastest) return null;

            const label = game.i18n.format("PF2E.SpeedLabel", {
                type: game.i18n.localize(CONFIG.PF2E.speedTypes[movementType]),
            });
            const speed: LabeledSpeed = { type: movementType, label, value: fastest.value };
            if (fastest.source) speed.source = fastest.source;

            const base = speed.value;
            const modifiers = extractModifiers(this.synthetics, selectors);
            const stat = mergeObject(new StatisticModifier(`${movementType}-speed`, modifiers, rollOptions), speed, {
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

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Remove any features linked to a to-be-deleted ABC item */
    override async deleteEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        ids: string[],
        context: DocumentModificationContext = {}
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]> {
        if (embeddedName === "Item") {
            const items = ids.map((id) => this.items.get(id));
            const linked = items.flatMap((item) => item?.getLinkedItems?.() ?? []);
            ids.push(...linked.map((item) => item.id));
        }

        return super.deleteEmbeddedDocuments(embeddedName, [...new Set(ids)], context) as Promise<
            ActiveEffectPF2e[] | ItemPF2e[]
        >;
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: CreatureUpdateContext<this>,
        user: UserPF2e
    ): Promise<void> {
        // Clamp hit points
        const hitPoints = changed.system?.attributes?.hp;
        if (typeof hitPoints?.value === "number") {
            hitPoints.value = options.allowHPOverage
                ? Math.max(0, hitPoints.value)
                : Math.clamped(hitPoints.value, 0, this.hitPoints.max);
        }

        // Clamp focus points
        const focusUpdate = changed.system?.resources?.focus;
        if (focusUpdate && this.system.resources) {
            if (typeof focusUpdate.max === "number") {
                focusUpdate.max = Math.clamped(focusUpdate.max, 0, 3);
            }

            const updatedPoints = Number(focusUpdate.value ?? this.system.resources.focus?.value) || 0;
            const enforcedMax = (Number(focusUpdate.max) || this.system.resources.focus?.max) ?? 0;
            focusUpdate.value = Math.clamped(updatedPoints, 0, enforcedMax);
            if (this.isToken) options.diff = false; // Force an update and sheet re-render
        }

        await super._preUpdate(changed, options, user);
    }
}

interface CreaturePF2e {
    readonly data: CreatureData;

    /** Saving throw rolls for the creature, built during data prep */
    saves: Record<SaveType, Statistic>;

    get traits(): Set<CreatureTrait>;

    get hitPoints(): HitPointsSummary;

    /** Expand DocumentModificationContext for creatures */
    update(data: DocumentUpdateData<this>, options?: CreatureUpdateContext<this>): Promise<this>;

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

export { CreaturePF2e };
