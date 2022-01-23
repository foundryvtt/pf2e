import { ActorPF2e } from "@actor";
import { CreatureData, SaveType } from "@actor/data";
import {
    CheckModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    MODIFIER_TYPE,
    RawModifier,
    StatisticModifier,
} from "@module/modifiers";
import { ItemPF2e, ArmorPF2e } from "@item";
import { prepareMinions } from "@scripts/actor/prepare-minions";
import { RuleElementSynthetics } from "@module/rules";
import { RollNotePF2e } from "@module/notes";
import { ActiveEffectPF2e } from "@module/active-effect";
import { hasInvestedProperty } from "@item/data/helpers";
import { CheckDC } from "@system/check-degree-of-success";
import { CheckPF2e } from "@system/rolls";
import {
    Alignment,
    AlignmentTrait,
    AttackRollContext,
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
import { MeasuredTemplatePF2e } from "@module/canvas";
import { TokenDocumentPF2e } from "@scene";
import { ErrorPF2e, objectHasKey } from "@util";
import { PredicatePF2e, RawPredicate } from "@system/predication";
import { UserPF2e } from "@module/user";
import { SKILL_DICTIONARY, SUPPORTED_ROLL_OPTIONS } from "@actor/data/values";
import { CreatureSensePF2e } from "./sense";
import { CombatantPF2e } from "@module/encounter";
import { HitPointsSummary } from "@actor/base";
import { Rarity } from "@module/data";

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class CreaturePF2e extends ActorPF2e {
    /** Used as a lock to prevent multiple asynchronous redraw requests from triggering an error */
    redrawingTokenEffects = false;

    /** Save data for the creature, built during data prep */
    override saves!: Record<SaveType, Statistic>;

    /** The creature's position on the alignment axes */
    get alignment(): Alignment {
        return this.data.data.details.alignment.value;
    }

    get rarity(): Rarity {
        return this.data.data.traits.rarity;
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

    get isDead(): boolean {
        const deathIcon = game.settings.get("pf2e", "deathIcon");
        const tokens = this.getActiveTokens();
        const hasDeathOverlay = tokens.length > 0 && tokens.every((token) => token.data.overlayEffect === deathIcon);
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

    get deception(): Statistic {
        const stat = this.data.data.skills.dec as StatisticModifier;
        return Statistic.from(this, stat, "deception", "PF2E.ActionsCheck.deception", "skill-check");
    }

    get stealth(): Statistic {
        const stat = this.data.data.skills.ste as StatisticModifier;
        return Statistic.from(this, stat, "stealth", "PF2E.ActionsCheck.stealth", "skill-check");
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

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();
        const attributes = this.data.data.attributes;
        attributes.hp = mergeObject(attributes.hp ?? {}, { negativeHealing: false });
        attributes.hardness ??= { value: 0 };
        if ("initiative" in attributes) {
            attributes.initiative.tiebreakPriority = this.hasPlayerOwner ? 2 : 1;
        }

        // Bless raw custom modifiers as `ModifierPF2e`s
        const customModifiers = (this.data.data.customModifiers ??= {});
        Object.values(customModifiers).forEach((modifiers: RawModifier[]) => {
            [...modifiers].forEach((modifier: RawModifier) => {
                const index = modifiers.indexOf(modifier);
                modifiers[index] = new ModifierPF2e(modifier);
            });
        });

        // Set base actor-shield data for PCs NPCs
        if (this.data.type === "character" || this.data.type === "npc") {
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
        this.data.data.toggles = {
            actions: [
                {
                    label: "PF2E.TargetFlatFootedLabel",
                    inputName: `flags.pf2e.rollOptions.all.target:flatFooted`,
                    checked: this.getFlag("pf2e", "rollOptions.all.target:flatFooted"),
                },
            ],
        };
    }

    /** Apply ActiveEffect-Like rule elements immediately after application of actual `ActiveEffect`s */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();

        for (const rule of this.rules) {
            rule.onApplyActiveEffects?.();
        }

        if ("shield" in this.attributes && this.attributes.shield.itemId) {
            this.rollOptions.all["self:shield:equipped"] = true;
        }

        for (const changeEntries of Object.values(this.data.data.autoChanges)) {
            changeEntries!.sort((a, b) => (Number(a.level) > Number(b.level) ? 1 : -1));
        }
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

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
    }

    protected prepareInitiative(
        statisticsModifiers: Record<string, ModifierPF2e[]>,
        rollNotes: Record<string, RollNotePF2e[] | undefined>
    ): void {
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

        const rollOptions = [proficiency, ...this.getRollOptions([proficiency, `${ability}-based`, "all"])];
        const modifiers = statisticsModifiers.initiative?.map((m) => m.clone({ test: rollOptions })) ?? [];

        const notes = rollNotes.initiative?.map((n) => duplicate(n)) ?? [];
        const label = game.i18n.format("PF2E.InitiativeWithSkill", { skillName: game.i18n.localize(proficiencyLabel) });
        const stat = mergeObject(new CheckModifier("initiative", initStat, modifiers), {
            ability: checkType,
            label,
            tiebreakPriority: this.data.data.attributes.initiative.tiebreakPriority,
            roll: async (args: InitiativeRollParams): Promise<InitiativeRollResult | null> => {
                if (!("initiative" in this.data.data.attributes)) return null;

                const options = Array.from(
                    new Set([
                        ...this.getRollOptions(["all", "initiative", `${ability}-based`, proficiency]),
                        ...(args.options ?? []),
                        proficiency,
                    ])
                );

                if (this.data.type === "character") ensureProficiencyOption(options, initStat.rank ?? -1);

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

                const roll = await CheckPF2e.roll(
                    new CheckModifier(label, systemData.attributes.initiative, args.modifiers),
                    { actor: this, type: "initiative", options, notes, dc: args.dc, skipDialog: args.skipDialog },
                    args.event
                );
                if (!roll) return null;

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
        const systemData = this.data.data;

        // Custom modifiers
        systemData.customModifiers ??= {};
        const { statisticsModifiers } = this.synthetics;
        for (const [selector, modifiers] of Object.entries(systemData.customModifiers)) {
            const syntheticModifiers = (statisticsModifiers[selector] ??= []);
            syntheticModifiers.push(...modifiers);
        }
    }

    /** Add a circumstance bonus if this creature has a raised shield */
    protected addShieldBonus(statisticModifiers: Record<string, ModifierPF2e[]>): void {
        if (!(this.data.type === "character" || this.data.type === "npc")) return;
        const shieldData = this.data.data.attributes.shield;
        if (shieldData.raised && !shieldData.broken) {
            const modifiers = (statisticModifiers["ac"] ??= []);
            modifiers.push(
                new ModifierPF2e({
                    label: shieldData.name,
                    slug: "raised-shield",
                    type: MODIFIER_TYPE.CIRCUMSTANCE,
                    modifier: shieldData.ac,
                })
            );
            this.rollOptions.all["self:shield:raised"] = true;
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
        damageType?: string,
        damageCategory?: string
    ) {
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
            modifier.ignored = !modifier.predicate.test!();

            customModifiers[stat] = (customModifiers[stat] ?? []).concat([modifier]);
            await this.update({ "data.customModifiers": customModifiers });
        }
    }

    /** Removes a custom modifier by slug */
    async removeCustomModifier(stat: string, modifier: number | string) {
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

    /** Toggle the given roll option (swapping it from true to false, or vice versa). */
    async toggleRollOption(domain: string, optionName: string) {
        if (!SUPPORTED_ROLL_OPTIONS.includes(domain) && !objectHasKey(this.data.data.skills, domain)) {
            throw new Error(`${domain} is not a supported roll`);
        }
        const flag = `rollOptions.${domain}.${optionName}`;
        return this.setFlag("pf2e", flag, !this.getFlag("pf2e", flag));
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
        const rollOptions = this.getRollOptions(["all", "speed", `${movementType}-speed`]);
        const modifiers: ModifierPF2e[] = [`${movementType}-speed`, "speed"]
            .flatMap((key) => this.synthetics.statisticsModifiers[key] || [])
            .map((modifier) => modifier.clone({ test: rollOptions }));

        if (movementType === "land") {
            const label = game.i18n.localize("PF2E.SpeedTypesLand");
            const base = Number(systemData.attributes.speed.value ?? 0);
            const stat = mergeObject(
                new StatisticModifier(game.i18n.format("PF2E.SpeedLabel", { type: label }), modifiers),
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
            const stat = mergeObject(
                new StatisticModifier(game.i18n.format("PF2E.SpeedLabel", { type: speed.label }), modifiers),
                speed,
                { overwrite: false }
            );
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

    override async updateEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        data: EmbeddedDocumentUpdateData<ActiveEffectPF2e | ItemPF2e>[],
        options: DocumentModificationContext = {}
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]> {
        const equippingUpdates = data.filter(
            (update) => "data.equipped.value" in update && typeof update["data.equipped.value"] === "boolean"
        );
        const wornArmor = this.wornArmor;

        for (const update of equippingUpdates) {
            if (!("data.equipped.value" in update)) continue;

            const item = this.physicalItems.get(update._id)!;
            // Allow no more than one article of armor to be equipped at a time
            if (wornArmor && item instanceof ArmorPF2e && item.isArmor && item.id !== wornArmor.id) {
                data.push({ _id: wornArmor.id, "data.equipped.value": false, "data.invested.value": false });
            }

            // Uninvested items as they're unequipped
            if (update["data.equipped.value"] === false && hasInvestedProperty(item.data)) {
                update["data.invested.value"] = false;
            }
        }

        return super.updateEmbeddedDocuments(embeddedName, data, options);
    }

    /* -------------------------------------------- */
    /*  Rolls                                       */
    /* -------------------------------------------- */

    /**
     * Roll a Recovery Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     */
    rollRecovery(event: JQuery.TriggeredEvent) {
        if (this.data.type !== "character") {
            throw Error("Recovery rolls are only applicable to characters");
        }

        const dying = this.data.data.attributes.dying.value;
        // const wounded = this.data.data.attributes.wounded.value; // not needed currently as the result is currently not automated
        const recoveryMod = getProperty(this.data.data.attributes, "dying.recoveryMod") || 0;

        const dc: CheckDC = {
            label: game.i18n.format("PF2E.Recovery.rollingDescription", {
                dying,
                dc: "{dc}", // Replace variable with variable, which will be replaced with the actual value in CheckModifiersDialog.Roll()
            }),
            value: 10 + recoveryMod + dying,
            visibility: "all",
        };

        const notes: RollNotePF2e[] = [
            new RollNotePF2e("all", game.i18n.localize("PF2E.Recovery.critSuccess"), undefined, ["criticalSuccess"]),
            new RollNotePF2e("all", game.i18n.localize("PF2E.Recovery.success"), undefined, ["success"]),
            new RollNotePF2e("all", game.i18n.localize("PF2E.Recovery.failure"), undefined, ["failure"]),
            new RollNotePF2e("all", game.i18n.localize("PF2E.Recovery.critFailure"), undefined, ["criticalFailure"]),
        ];

        const modifier = new StatisticModifier(game.i18n.localize("PF2E.FlatCheck"), []);

        CheckPF2e.roll(modifier, { actor: this, dc, notes }, event);

        // No automated update yet, not sure if Community wants that.
        // return this.update({[`data.attributes.dying.value`]: dying}, [`data.attributes.wounded.value`]: wounded});
    }

    /** Redraw token effect icons after adding/removing partial ActiveEffects to Actor#temporaryEffects */
    redrawTokenEffects() {
        if (!(game.ready && canvas.scene) || this.redrawingTokenEffects) return;
        this.redrawingTokenEffects = true;
        const promises = Promise.allSettled(this.getActiveTokens().map((token) => token.drawEffects()));
        promises.then(() => {
            this.redrawingTokenEffects = false;
        });
    }

    /**
     * Calculates attack roll target data including the target's DC.
     * All attack rolls have the "all" and "attack-roll" domains and the "attack" trait,
     * but more can be added via the options.
     */
    createAttackRollContext(options: { domains?: string[]; traits?: string[] } = {}): AttackRollContext {
        const domains = ["all", "attack-roll", ...(options?.domains ?? [])];
        const context = this.createStrikeRollContext(domains);
        let dc: CheckDC | null = null;
        if (context.target?.actor && context.target.actor) {
            const attackTraits = ["attack", ...(options.traits ?? [])];
            // Clone the actor to recalculate its AC with contextual roll options
            const contextActor = context.target.actor.getContextualClone([
                ...this.getSelfRollOptions("origin"),
                ...attackTraits.map((trait) => `trait:${trait}`),
            ]);

            const { attributes } = contextActor;
            if (attributes.ac) {
                dc = {
                    label: game.i18n.format("PF2E.CreatureStatisticDC.ac", {
                        creature: context.target.name,
                        dc: "{dc}",
                    }),
                    scope: "AttackOutcome",
                    value: attributes.ac.value,
                };
            }
        }
        return {
            options: Array.from(new Set(context.options)),
            targets: context.targets,
            dc,
            distance: context.distance,
        };
    }

    protected createDamageRollContext(event: JQuery.Event) {
        const context = this.createStrikeRollContext(["all", "damage-roll"]);
        return {
            event,
            options: Array.from(new Set(context.options)),
            targets: context.targets,
            distance: context.distance,
        };
    }

    private createStrikeRollContext(domains: string[]) {
        const targets = Array.from(game.user.targets).filter((token) => token.actor instanceof CreaturePF2e);
        const target = targets.length === 1 && targets[0].actor instanceof CreaturePF2e ? targets[0] : null;

        const selfOptions = Array.from(this.getRollOptions(domains));
        // Clone the actor to get contextual target options
        const contextActor = target?.actor?.getContextualClone([...this.getSelfRollOptions("origin")]) ?? null;
        const targetOptions = Array.from(contextActor?.getSelfRollOptions("target") ?? []);
        // Target roll options
        const options = Array.from(new Set([selfOptions, targetOptions].flat()));

        // Calculate distance and set as a roll option
        const selfToken = canvas.tokens.controlled.find((token) => token.actor === this);
        const distance =
            selfToken && target && !!canvas.grid
                ? ((): number => {
                      const groundDistance = MeasuredTemplatePF2e.measureDistance(selfToken.position, target.position);
                      const elevationDiff = Math.abs(selfToken.data.elevation - target.data.elevation);
                      return Math.floor(Math.sqrt(Math.pow(groundDistance, 2) + Math.pow(elevationDiff, 2)));
                  })()
                : null;
        options.push(`target:distance:${distance}`);

        return {
            options,
            targets: new Set(targets),
            target,
            distance,
        };
    }

    /** Work around bug in which creating embedded items via actor.update doesn't trigger _onCreateEmbeddedDocuments */
    override async update(data: DocumentUpdateData<this>, options?: DocumentModificationContext<this>): Promise<this> {
        await super.update(data, options);

        const hasItemInserts =
            Array.isArray(data.items) &&
            data.items.some((item) => item instanceof Object && !this.items.get(item.id ?? ""));
        if (hasItemInserts && this.parent instanceof TokenDocumentPF2e) {
            this.redrawTokenEffects();
        }

        return this;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Re-prepare familiars when their masters are updated */
    protected override _onUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentUpdateContext<this>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);
        prepareMinions(this);
        if (changed.items && this.isToken && userId !== game.user.id) {
            this.redrawTokenEffects();
        }
    }

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
