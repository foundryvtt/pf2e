import { ActorPF2e, PartyPF2e } from "@actor";
import { HitPointsSummary } from "@actor/base.ts";
import { StrikeData } from "@actor/data/base.ts";
import { CreatureSource } from "@actor/data/index.ts";
import { MODIFIER_TYPES, ModifierPF2e, RawModifier, StatisticModifier } from "@actor/modifiers.ts";
import { MovementType, SaveType, SkillLongForm } from "@actor/types.ts";
import { ArmorPF2e, ItemPF2e, PhysicalItemPF2e } from "@item";
import { isCycle } from "@item/container/helpers.ts";
import { ArmorSource, ItemType } from "@item/data/index.ts";
import { EquippedData, ItemCarryType } from "@item/physical/data.ts";
import { isEquipped } from "@item/physical/usage.ts";
import { ActiveEffectPF2e } from "@module/active-effect.ts";
import { Rarity, SIZES, SIZE_SLUGS } from "@module/data.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { extractModifiers } from "@module/rules/helpers.ts";
import { RuleElementSynthetics } from "@module/rules/index.ts";
import { BaseSpeedSynthetic } from "@module/rules/synthetics.ts";
import { UserPF2e } from "@module/user/index.ts";
import { LightLevels } from "@scene/data.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { CheckPF2e, CheckRoll } from "@system/check/index.ts";
import { CheckDC } from "@system/degree-of-success.ts";
import type { ArmorStatistic } from "@system/statistic/armor-class.ts";
import { Statistic, StatisticDifficultyClass } from "@system/statistic/index.ts";
import { ErrorPF2e, isObject, localizer, setHasElement } from "@util";
import {
    CreatureSkills,
    CreatureSpeeds,
    CreatureSystemData,
    LabeledSpeed,
    SenseData,
    VisionLevel,
    VisionLevels,
} from "./data.ts";
import { setImmunitiesFromTraits } from "./helpers.ts";
import { CreatureSensePF2e } from "./sense.ts";
import { Alignment, AlignmentTrait, CreatureTrait, CreatureUpdateContext, GetReachParameters } from "./types.ts";
import { SIZE_TO_REACH } from "./values.ts";

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
abstract class CreaturePF2e<
    TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null
> extends ActorPF2e<TParent> {
    declare parties: Set<PartyPF2e>;
    /** A creature always has an AC */
    declare armorClass: StatisticDifficultyClass<ArmorStatistic>;
    /** Skill checks for the creature, built during data prep */
    declare skills: CreatureSkills;
    /** Saving throw rolls for the creature, built during data prep */
    declare saves: Record<SaveType, Statistic>;

    declare perception: Statistic;

    /** The creature's position on the alignment axes */
    get alignment(): Alignment {
        return this.system.details.alignment.value;
    }

    get rarity(): Rarity {
        return this.system.traits.rarity;
    }

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "affliction"];
    }

    /**
     * A currently naive measurement of this creature's reach
     * @param [context.action] The action context of the reach measurement. Interact actions don't consider weapons.
     * @param [context.weapon] The "weapon," literal or otherwise, used in an attack-reach measurement
     */
    override getReach({ action = "interact", weapon = null }: GetReachParameters = {}): number {
        const baseReach = this.attributes.reach.base;

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
        const { senses } = this.system.traits;
        const hasSensesData =
            Array.isArray(senses) &&
            senses.every((s): s is CreatureSensePF2e => isObject(s) && "type" in s && typeof s.type === "string");
        if (!hasSensesData) {
            return VisionLevels.NORMAL;
        }

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

    get wornArmor(): ArmorPF2e<this> | null {
        return this.itemTypes.armor.find((armor) => armor.isEquipped && armor.isArmor) ?? null;
    }

    /** Get the held shield of most use to the wielder */
    override get heldShield(): ArmorPF2e<this> | null {
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

    override getStatistic(slug: SaveType | SkillLongForm | "perception"): Statistic;
    override getStatistic(slug: string): Statistic | null;
    override getStatistic(slug: string): Statistic | null {
        return slug === "perception"
            ? this.perception
            : this.spellcasting.contents.flatMap((sc) => sc.statistic ?? []).find((s) => s.slug === slug) ??
                  super.getStatistic(slug);
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this.parties ??= new Set();
        super._initialize(options);
    }

    override prepareData(): void {
        super.prepareData();
        for (const party of this.parties) {
            party.reset({ actor: true });
        }
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
        attributes.reach = { base: 0, manipulate: 0 };

        if (attributes.initiative) {
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

        attributes.doomed = { value: 0, max: 3 };
        attributes.dying = { value: 0, max: 4, recoveryDC: 10 };
        attributes.wounded = { value: 0, max: 3 };

        // Set IWR guaranteed by traits
        setImmunitiesFromTraits(this);
    }

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
        attributes.reach.base = Math.max(attributes.reach.base, reachFromSize);
        attributes.reach.manipulate = Math.max(attributes.reach.manipulate, attributes.reach.base, reachFromSize);

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

        // Set whether the actor's shield is raised
        if (attributes.shield?.raised && !attributes.shield.broken) {
            this.rollOptions.all["self:shield:raised"] = true;
        }

        // Set whether this creature emits sound
        this.system.attributes.emitsSound = !this.isDead;

        this.prepareSynthetics();

        const sizeIndex = SIZES.indexOf(this.size);
        const sizeSlug = SIZE_SLUGS[sizeIndex];
        rollOptions.all[`self:size:${sizeIndex}`] = true;
        rollOptions.all[`self:size:${sizeSlug}`] = true;

        // Handle caps derived from dying
        attributes.wounded.max = Math.max(0, attributes.dying.max - 1);
        attributes.doomed.max = attributes.dying.max;

        // Set dying, doomed, and wounded statuses according to embedded conditions
        for (const conditionSlug of ["doomed", "wounded", "dying"] as const) {
            const condition = this.conditions.bySlug(conditionSlug, { active: true }).at(0);
            const status = attributes[conditionSlug];
            if (conditionSlug === "dying") {
                status.max -= attributes.doomed.value;
            }
            status.value = Math.min(condition?.value ?? 0, status.max);
        }
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

    /**
     * Changes the carry type of an item (held/worn/stowed/etc) and/or regrips/reslots
     * @param item       The item
     * @param carryType  Location to be set to
     * @param handsHeld  Number of hands being held
     * @param inSlot     Whether the item is in the slot or not. Equivilent to "equipped" previously
     */
    async adjustCarryType(
        item: PhysicalItemPF2e<CreaturePF2e>,
        {
            carryType,
            handsHeld = 0,
            inSlot = false,
        }: {
            carryType: ItemCarryType;
            handsHeld?: number;
            inSlot?: boolean;
        }
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
    async addCustomModifier(stat: string, label: string, value: number, type: string): Promise<void> {
        stat = stat === "armor" ? "ac" : stat;
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
                custom: true,
            }).toObject();

            await this.update({ [`system.customModifiers.${stat}`]: [...modifiers, modifier] });
        }
    }

    /** Removes a custom modifier by slug */
    async removeCustomModifier(stat: string, slug: string): Promise<void> {
        stat = stat === "armor" ? "ac" : stat;
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

        const localize = localizer("PF2E.Recovery");

        // const wounded = this.system.attributes.wounded.value; // not needed currently as the result is currently not automated
        const recoveryDC = dying.recoveryDC;

        const dc: CheckDC = {
            label: localize("rollingDescription", {
                dying: dying.value,
                dc: "{dc}", // Replace variable with variable, which will be replaced with the actual value in CheckModifiersDialog.Roll()
            }),
            value: recoveryDC + dying.value,
            visible: true,
        };

        const notes = [
            new RollNotePF2e({
                selector: "all",
                text: localize("critSuccess"),
                outcome: ["criticalSuccess"],
            }),
            new RollNotePF2e({
                selector: "all",
                text: localize("success"),
                outcome: ["success"],
            }),
            new RollNotePF2e({
                selector: "all",
                text: localize("failure"),
                outcome: ["failure"],
            }),
            new RollNotePF2e({
                selector: "all",
                text: localize("critFailure"),
                outcome: ["criticalFailure"],
            }),
        ];

        const modifier = new StatisticModifier(game.i18n.localize("PF2E.Check.Specific.Recovery"), []);
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

        if (movementType === "land") {
            const domains = ["speed", "all-speeds", `${movementType}-speed`];
            const rollOptions = this.getRollOptions(domains);
            const landSpeed = systemData.attributes.speed;
            landSpeed.value = Number(landSpeed.value) || 0;

            const fromSynthetics = (this.synthetics.movementTypes[movementType] ?? []).flatMap((d) => d() ?? []);
            landSpeed.value = Math.max(landSpeed.value, ...fromSynthetics.map((s) => s.value));

            const modifiers = extractModifiers(this.synthetics, domains);
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
            };
            this.rollOptions.all["speed:land"] = true;

            const merged = mergeObject(stat, otherData);
            Object.defineProperties(merged, {
                total: {
                    get(): number {
                        return stat.value + stat.totalModifier;
                    },
                },
                breakdown: {
                    get(): string {
                        return [
                            `${game.i18n.format("PF2E.SpeedBaseLabel", { type: typeLabel })} ${stat.value}`,
                            ...stat.modifiers.filter((m) => m.enabled).map((m) => `${m.label} ${m.signedValue}`),
                        ].join(", ");
                    },
                },
            });

            return merged;
        } else {
            const candidateSpeeds = ((): (BaseSpeedSynthetic | LabeledSpeed)[] => {
                const { otherSpeeds } = systemData.attributes.speed;
                const existing = otherSpeeds.filter((s) => s.type === movementType);
                const fromSynthetics = (this.synthetics.movementTypes[movementType] ?? []).map((d) => d() ?? []).flat();
                return [...existing, ...fromSynthetics];
            })();
            const fastest = candidateSpeeds.reduce(
                (best: LabeledSpeed | BaseSpeedSynthetic | null, speed) =>
                    !best ? speed : speed?.value > best.value ? speed : best,
                null
            );
            if (!fastest) return null;

            // If this speed is derived from the creature's land speed, avoid reapplying the same modifiers
            const domains = fastest.derivedFromLand
                ? [`${movementType}-speed`]
                : ["speed", "all-speeds", `${movementType}-speed`];
            const rollOptions = this.getRollOptions(domains);

            const label = game.i18n.localize(CONFIG.PF2E.speedTypes[movementType]);
            const speed: LabeledSpeed = { type: movementType, label, value: fastest.value };
            if (fastest.source) speed.source = fastest.source;

            this.rollOptions.all[`speed:${movementType}`] = true;

            const modifiers = extractModifiers(this.synthetics, domains);
            const stat = new StatisticModifier(`${movementType}-speed`, modifiers, rollOptions);
            const merged = mergeObject(stat, speed, { overwrite: false });
            Object.defineProperties(merged, {
                total: {
                    get(): number {
                        return speed.value + stat.totalModifier;
                    },
                },
                breakdown: {
                    get(): string {
                        return [`${game.i18n.format("PF2E.SpeedBaseLabel", { type: speed.label })} ${speed.value}`]
                            .concat(
                                stat.modifiers
                                    .filter((m) => m.enabled)
                                    .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                            )
                            .join(", ");
                    },
                },
            });

            return merged;
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Remove any features linked to a to-be-deleted ABC item */
    override deleteEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        ids: string[],
        context?: DocumentModificationContext<this>
    ): Promise<CollectionValue<this["effects"]>[] | CollectionValue<this["items"]>[]> {
        if (embeddedName === "Item") {
            const items = ids.map((id) => this.items.get(id));
            const linked = items.flatMap((item) => item?.getLinkedItems?.() ?? []);
            ids.push(...linked.map((item) => item.id));
        }

        return super.deleteEmbeddedDocuments(embeddedName, [...new Set(ids)], context);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: CreatureUpdateContext<TParent>,
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

interface CreaturePF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: CreatureSource;
    system: CreatureSystemData;

    get traits(): Set<CreatureTrait>;

    get hitPoints(): HitPointsSummary;

    /** Expand DocumentModificationContext for creatures */
    update(data: DocumentUpdateData<this>, options?: CreatureUpdateContext<TParent>): Promise<this>;

    /** See implementation in class */
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        updateData: EmbeddedDocumentUpdateData<ActiveEffectPF2e<this>>[],
        options?: DocumentUpdateContext<this>
    ): Promise<ActiveEffectPF2e<this>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Item",
        updateData: EmbeddedDocumentUpdateData<ItemPF2e<this>>[],
        options?: DocumentUpdateContext<this>
    ): Promise<ItemPF2e<this>[]>;
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        updateData: EmbeddedDocumentUpdateData<ActiveEffectPF2e<this> | ItemPF2e<this>>[],
        options?: DocumentUpdateContext<this>
    ): Promise<ActiveEffectPF2e<this>[] | ItemPF2e<this>[]>;

    deleteEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        ids: string[],
        context?: DocumentModificationContext<this>
    ): Promise<CollectionValue<this["effects"]>[]>;
    deleteEmbeddedDocuments(
        embeddedName: "Item",
        ids: string[],
        context?: DocumentModificationContext<this>
    ): Promise<CollectionValue<this["items"]>[]>;
    deleteEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        ids: string[],
        context?: DocumentModificationContext<this>
    ): Promise<CollectionValue<this["effects"]>[] | CollectionValue<this["items"]>[]>;
}

export { CreaturePF2e };
