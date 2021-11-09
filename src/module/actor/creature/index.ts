import { ActorPF2e } from "@actor/base";
import { CreatureData } from "@actor/data";
import { ModifierPF2e, RawModifier, StatisticModifier } from "@module/modifiers";
import { ItemPF2e, ArmorPF2e } from "@item";
import { prepareMinions } from "@scripts/actor/prepare-minions";
import { RuleElementPF2e } from "@module/rules/rule-element";
import { RollNotePF2e } from "@module/notes";
import { RuleElementSynthetics } from "@module/rules/rules-data-definitions";
import { ActiveEffectPF2e } from "@module/active-effect";
import { hasInvestedProperty } from "@item/data/helpers";
import { CheckDC } from "@system/check-degree-of-success";
import { CheckPF2e } from "@system/rolls";
import {
    Alignment,
    AlignmentComponent,
    AttackRollContext,
    CreatureSpeeds,
    LabeledSpeed,
    MovementType,
    SenseData,
    VisionLevel,
    VisionLevels,
} from "./data";
import { LightLevels } from "@module/scene/data";
import { Statistic } from "@system/statistic";
import { MeasuredTemplatePF2e, TokenPF2e } from "@module/canvas";
import { TokenDocumentPF2e } from "@scene";
import { ErrorPF2e, objectHasKey } from "@util";
import { PredicatePF2e, RawPredicate } from "@system/predication";
import { UserPF2e } from "@module/user";
import { SUPPORTED_ROLL_OPTIONS } from "@actor/data/values";
import { CreatureSensePF2e } from "./sense";

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class CreaturePF2e extends ActorPF2e {
    /** Used as a lock to prevent multiple asynchronous redraw requests from triggering an error */
    redrawingTokenEffects = false;

    /** The creature's position on the alignment axes */
    get alignment(): Alignment {
        return this.data.data.details.alignment.value;
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
        return this.visionLevel === VisionLevels.DARKVISION;
    }

    get hasLowLightVision(): boolean {
        return this.visionLevel >= VisionLevels.LOWLIGHT;
    }

    override get canSee(): boolean {
        if (!canvas.scene) return true;
        if (this.visionLevel === VisionLevels.BLINDED) return false;

        const lightLevel = canvas.scene.lightLevel;
        return lightLevel > LightLevels.DARKNESS || this.hasDarkvision;
    }

    get isDead(): boolean {
        const hasDeathOverlay = !this.getActiveTokens().some(
            (token) => token.data.overlayEffect !== "icons/svg/skull.svg"
        );
        return (this.hitPoints.value === 0 || hasDeathOverlay) && !this.hasCondition("dying");
    }

    get hitPoints(): { value: number; max: number; negativeHealing: boolean } {
        return {
            value: this.data.data.attributes.hp.value,
            max: this.data.data.attributes.hp.max,
            negativeHealing: this.data.data.attributes.hp.negativeHealing,
        };
    }

    get attributes(): this["data"]["data"]["attributes"] {
        return this.data.data.attributes;
    }

    get perception(): Statistic {
        const stat = this.data.data.attributes.perception as StatisticModifier;
        return Statistic.from(this, stat, "perception", "PF2E.PerceptionCheck", "perception-check");
    }

    get fortitude(): Statistic {
        return this.buildSavingThrowStatistic("fortitude");
    }

    get reflex(): Statistic {
        return this.buildSavingThrowStatistic("reflex");
    }

    get will(): Statistic {
        return this.buildSavingThrowStatistic("will");
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

        // Bless raw custom modifiers as `ModifierPF2e`s
        const customModifiers = (this.data.data.customModifiers ??= {});
        Object.values(customModifiers).forEach((modifiers: RawModifier[]) => {
            [...modifiers].forEach((modifier: RawModifier) => {
                const index = modifiers.indexOf(modifier);
                modifiers[index] = ModifierPF2e.fromObject(modifier);
            });
        });
    }

    /** Apply ActiveEffect-Like rule elements immediately after application of actual `ActiveEffect`s */
    override prepareEmbeddedEntities(): void {
        super.prepareEmbeddedEntities();

        for (const rule of this.rules) {
            rule.onApplyActiveEffects();
        }

        for (const changeEntries of Object.values(this.data.data.autoChanges)) {
            changeEntries!.sort((a, b) => (Number(a.level) > Number(b.level) ? 1 : -1));
        }
    }

    // Set whether this actor is wearing armor
    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.rollOptions.all["self:armored"] = !!this.wornArmor && this.wornArmor.category !== "unarmored";
    }

    /** Compute custom stat modifiers provided by users or given by conditions. */
    protected prepareCustomModifiers(rules: RuleElementPF2e[]): RuleElementSynthetics {
        // Collect all sources of modifiers for statistics and damage in these two maps, which map ability -> modifiers.
        const actorData = this.data;
        const synthetics: RuleElementSynthetics = {
            damageDice: {},
            multipleAttackPenalties: {},
            rollNotes: {},
            senses: [],
            statisticsModifiers: {},
            strikes: [],
            striking: {},
            weaponPotency: {},
        };
        const statisticsModifiers = synthetics.statisticsModifiers;

        for (const rule of rules) {
            try {
                rule.onBeforePrepareData(actorData, synthetics);
            } catch (error) {
                // ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onBeforePrepareData on rule element ${rule}.`, error);
            }
        }

        // Get all of the active conditions (from the item array), and add their modifiers.
        const conditions = this.itemTypes.condition
            .filter((c) => c.data.flags.pf2e?.condition && c.data.data.active)
            .map((c) => c.data);

        for (const [key, value] of game.pf2e.ConditionManager.getModifiersFromConditions(conditions.values())) {
            statisticsModifiers[key] = (statisticsModifiers[key] || []).concat(value);
        }

        // Character-specific custom modifiers & custom damage dice.
        if (["character", "familiar", "npc"].includes(actorData.type)) {
            const { data } = actorData;

            // Custom Modifiers (which affect d20 rolls and damage).
            data.customModifiers = data.customModifiers ?? {};
            for (const [statistic, modifiers] of Object.entries(data.customModifiers)) {
                statisticsModifiers[statistic] = (statisticsModifiers[statistic] ?? []).concat(modifiers);
            }

            // Damage Dice (which add dice to damage rolls).
            data.damageDice = data.damageDice ?? {};
            const damageDice = synthetics.damageDice;
            for (const [attack, dice] of Object.entries(data.damageDice)) {
                damageDice[attack] = (damageDice[attack] || []).concat(dice);
            }
        }

        return synthetics;
    }

    /**
     * Adds a custom modifier that will be included when determining the final value of a stat. The
     * name parameter must be unique for the custom modifiers for the specified stat, or it will be
     * ignored.
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
        // TODO: Consider adding another 'addCustomModifier' function in the future which takes a full PF2Modifier object,
        // similar to how addDamageDice operates.
        const customModifiers = duplicate(this.data.data.customModifiers ?? {});
        if (!(customModifiers[stat] ?? []).find((m) => m.name === name)) {
            const modifier = new ModifierPF2e(name, value, type);
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

    /** Removes a custom modifier by name. */
    async removeCustomModifier(stat: string, modifier: number | string) {
        const customModifiers = duplicate(this.data.data.customModifiers ?? {});
        if (typeof modifier === "number" && customModifiers[stat] && customModifiers[stat].length > modifier) {
            customModifiers[stat].splice(modifier, 1);
            await this.update({ "data.customModifiers": customModifiers });
        } else if (typeof modifier === "string" && customModifiers[stat]) {
            customModifiers[stat] = customModifiers[stat].filter((m) => m.name !== modifier);
            await this.update({ "data.customModifiers": customModifiers });
        } else {
            throw Error("Custom modifiers can only be removed by name (string) or index (number)");
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

    prepareSpeed(movementType: "land", synthetics: RuleElementSynthetics): CreatureSpeeds;
    prepareSpeed(
        movementType: Exclude<MovementType, "land">,
        synthetics: RuleElementSynthetics
    ): LabeledSpeed & StatisticModifier;
    prepareSpeed(
        movementType: MovementType,
        synthetics: RuleElementSynthetics
    ): CreatureSpeeds | (LabeledSpeed & StatisticModifier);
    prepareSpeed(
        movementType: MovementType,
        synthetics: RuleElementSynthetics
    ): CreatureSpeeds | (LabeledSpeed & StatisticModifier) {
        const systemData = this.data.data;
        const rollOptions = this.getRollOptions(["all", "speed", `${movementType}-speed`]);
        const modifiers: ModifierPF2e[] = [`${movementType}-speed`, "speed"]
            .map((key) => (synthetics.statisticsModifiers[key] || []).map((modifier) => modifier.clone()))
            .flat()
            .map((modifier) => {
                modifier.ignored = !modifier.predicate.test(modifier.defaultRollOptions ?? rollOptions);
                return modifier;
            });

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
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                )
                .join(", ");
            return stat;
        } else {
            const speed = systemData.attributes.speed.otherSpeeds.find(
                (otherSpeed) => otherSpeed.type === movementType
            );
            if (!speed) throw ErrorPF2e("Unexpected missing speed");
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
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                )
                .join(", ");
            return stat;
        }
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
    rollRecovery() {
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

        CheckPF2e.roll(modifier, { actor: this, dc, notes });

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

    private buildSavingThrowStatistic(savingThrow: "fortitude" | "reflex" | "will"): Statistic {
        const label = game.i18n.format("PF2E.SavingThrowWithName", {
            saveName: game.i18n.localize(CONFIG.PF2E.saves[savingThrow]),
        });
        return Statistic.from(this, this.data.data.saves[savingThrow], savingThrow, label, "saving-throw");
    }

    protected createAttackRollContext(event: JQuery.TriggeredEvent, rollNames: string[]): AttackRollContext {
        const ctx = this.createStrikeRollContext(rollNames);
        let dc: CheckDC | null = null;
        let distance: number | null = null;
        if (ctx.target?.actor instanceof CreaturePF2e) {
            dc = {
                label: game.i18n.format("PF2E.CreatureStatisticDC.ac", {
                    creature: ctx.target.name,
                    dc: "{dc}",
                }),
                scope: "AttackOutcome",
                value: ctx.target.actor.data.data.attributes.ac.value,
            };

            // calculate distance
            const self = canvas.tokens.controlled.find((token) => token.actor?.id === this.id);
            if (self && canvas.grid?.grid instanceof SquareGrid) {
                const groundDistance = MeasuredTemplatePF2e.measureDistance(self.position, ctx.target.position);
                const elevationDiff = Math.abs(self.data.elevation - ctx.target.data.elevation);
                distance = Math.floor(Math.sqrt(Math.pow(groundDistance, 2) + Math.pow(elevationDiff, 2)));
            }
        }
        return {
            event,
            options: Array.from(new Set(ctx.options)),
            targets: ctx.targets,
            dc,
            distance,
        };
    }

    protected createDamageRollContext(event: JQuery.Event) {
        const ctx = this.createStrikeRollContext(["all", "damage-roll"]);
        return {
            event,
            options: Array.from(new Set(ctx.options)),
            targets: ctx.targets,
        };
    }

    private createStrikeRollContext(rollNames: string[]) {
        const options = this.getRollOptions(rollNames);

        const getAlignmentTraits = (alignment: Alignment): AlignmentComponent[] => {
            return [
                ...new Set([
                    ...(["LG", "NG", "CG"].includes(alignment) ? (["good"] as const) : []),
                    ...(["LE", "NE", "CE"].includes(alignment) ? (["evil"] as const) : []),
                    ...(["LG", "LN", "LE"].includes(alignment) ? (["lawful"] as const) : []),
                    ...(["CG", "CN", "CE"].includes(alignment) ? (["chaotic"] as const) : []),
                ]),
            ];
        };
        const conditions = this.itemTypes.condition.filter((condition) => condition.fromSystem);
        options.push(
            ...conditions
                .map((condition) => [`self:${condition.data.data.hud.statusName}`, `condition:${condition.slug}`])
                .flat(),
            ...getAlignmentTraits(this.alignment).map((alignment) => `trait:${alignment}`)
        );
        if (this.hitPoints.negativeHealing) {
            options.push("negative-healing");
        }

        const targets: TokenPF2e[] = Array.from(game.user.targets).filter(
            (token) => token.actor instanceof CreaturePF2e
        );
        const target = targets.length === 1 && targets[0].actor instanceof CreaturePF2e ? targets[0] : undefined;
        if (target?.actor instanceof CreaturePF2e) {
            if (target.actor.hitPoints.negativeHealing) {
                options.push("target:negative-healing");
            }

            const { itemTypes } = target.actor;
            const targetConditions = itemTypes.condition.filter((condition) => condition.fromSystem);
            const targetIsSpellcaster = itemTypes.spellcastingEntry.length > 0 && itemTypes.spell.length > 0;
            options.push(
                ...targetConditions
                    .map((condition) => [
                        `target:${condition.data.data.hud.statusName}`,
                        `target:condition:${condition.slug}`,
                    ])
                    .flat(),
                ...getAlignmentTraits(target.actor.alignment).map((alignment) => `target:trait:${alignment}`),
                ...(targetIsSpellcaster ? ["target:caster"] : []).flat()
            );
        }

        const traits = (target?.actor?.data.data.traits.traits.custom ?? "")
            .split(/[;,\\|]/)
            .map((value) => value.trim())
            .concat(target?.actor?.data.data.traits.traits.value ?? [])
            .filter((value) => !!value)
            .map((trait) => [`target:${trait}`, `target:trait:${trait}`])
            .flat();
        options.push(...traits);

        return {
            options: [...new Set(options)],
            targets: new Set(targets),
            target,
        };
    }

    /** Work around bug in which creating embedded items via actor.update doesn't trigger _onCreateEmbeddedDocuments */
    override async update(data: DocumentUpdateData<this>, options?: DocumentModificationContext): Promise<this> {
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
        options: DocumentModificationContext,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);
        prepareMinions(this);
        if (changed.items && this.isToken && userId !== game.user.id) {
            this.redrawTokenEffects();
        }
    }

    protected override async _preUpdate(
        data: DeepPartial<this["data"]["_source"]>,
        options: DocumentModificationContext,
        user: UserPF2e
    ) {
        // Clamp focus points
        const focus = data.data && "resources" in data.data ? data.data?.resources?.focus ?? null : null;
        if (focus && "resources" in this.data.data) {
            if (typeof focus.max === "number") {
                focus.max = Math.clamped(focus.max, 0, 3);
            }

            const currentPoints = focus.value ?? this.data.data.resources.focus?.value ?? 0;
            const currentMax = focus.max ?? this.data.data.resources.focus?.max ?? 0;
            focus.value = Math.clamped(currentPoints, 0, currentMax);
        }

        // Clamp HP
        const hitPoints = data.data?.attributes?.hp;
        if (typeof hitPoints?.value === "number") {
            hitPoints.value = Math.clamped(hitPoints.value, 0, this.hitPoints.max);
        }

        await super._preUpdate(data, options, user);
    }
}

export interface CreaturePF2e {
    readonly data: CreatureData;

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
