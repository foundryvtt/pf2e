import { ActorPF2e, type PartyPF2e } from "@actor";
import type { HitPointsSummary } from "@actor/base.ts";
import { CORE_RESOURCES } from "@actor/character/values.ts";
import type { CreatureSource } from "@actor/data/index.ts";
import { MODIFIER_TYPES, ModifierPF2e, RawModifier } from "@actor/modifiers.ts";
import { ActorSpellcasting } from "@actor/spellcasting.ts";
import { MovementType, SaveType, SkillSlug } from "@actor/types.ts";
import { MOVEMENT_TYPES } from "@actor/values.ts";
import type { Rolled } from "@client/dice/_module.d.mts";
import type {
    DatabaseDeleteCallbackOptions,
    DatabaseDeleteOperation,
    DatabaseUpdateOperation,
} from "@common/abstract/_types.d.mts";
import { ArmorPF2e, ItemPF2e, PhysicalItemPF2e, ShieldPF2e, SpellcastingEntryPF2e } from "@item";
import { ArmorSource, ItemType } from "@item/base/data/index.ts";
import { isContainerCycle } from "@item/container/helpers.ts";
import { EquippedData, ItemCarryType } from "@item/physical/data.ts";
import { isEquipped } from "@item/physical/usage.ts";
import { SpellCollection } from "@item/spellcasting-entry/collection.ts";
import { ItemSpellcasting } from "@item/spellcasting-entry/item-spellcasting.ts";
import { RitualSpellcasting } from "@item/spellcasting-entry/rituals.ts";
import type { SpellcastingEntry } from "@item/spellcasting-entry/types.ts";
import type { ActiveEffectPF2e } from "@module/active-effect.ts";
import { ItemAttacher } from "@module/apps/item-attacher.ts";
import { Rarity, SIZE_SLUGS, SIZES, ZeroToFour, ZeroToTwo } from "@module/data.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import type { TokenDocumentPF2e } from "@scene";
import { LightLevels } from "@scene/data.ts";
import type { CheckRoll } from "@system/check/index.ts";
import { CheckDC } from "@system/degree-of-success.ts";
import { Predicate } from "@system/predication.ts";
import { Statistic, StatisticDifficultyClass, type ArmorStatistic } from "@system/statistic/index.ts";
import { PerceptionStatistic } from "@system/statistic/perception.ts";
import { SpeedStatistic, SpeedStatisticTraceData } from "@system/statistic/speed.ts";
import { ErrorPF2e, localizer, setHasElement, sluggify, tupleHasValue } from "@util";
import * as R from "remeda";
import { CreatureMovementData, CreatureResources, CreatureSystemData, VisionLevel, VisionLevels } from "./data.ts";
import { imposeEncumberedCondition, setImmunitiesFromTraits } from "./helpers.ts";
import type {
    CreatureMovement,
    CreatureSpeeds,
    CreatureType,
    CreatureUpdateCallbackOptions,
    CreatureUpdateOperation,
    GetReachParameters,
    ResourceData,
} from "./types.ts";

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
abstract class CreaturePF2e<
    TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null,
> extends ActorPF2e<TParent> {
    /** A separate collection of owned spellcasting entries for convenience */
    declare spellcasting: ActorSpellcasting<this>;

    declare parties: Set<PartyPF2e>;
    /** A creature always has an AC */
    declare armorClass: StatisticDifficultyClass<ArmorStatistic>;
    /** Skill checks for the creature, built during data prep */
    declare skills: Record<string, Statistic<this>>;
    /** Saving throw rolls for the creature, built during data prep */
    declare saves: Record<SaveType, Statistic>;

    declare perception: PerceptionStatistic;

    declare movement: CreatureMovement<this>;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "affliction"];
    }

    /** Types of creatures (as provided by bestiaries 1-3) of which this creature is a member */
    get creatureTypes(): CreatureType[] {
        return this.system.traits.value.filter((t): t is CreatureType => t in CONFIG.PF2E.creatureTypes).sort();
    }

    get rarity(): Rarity {
        return this.system.traits.rarity;
    }

    override get hardness(): number {
        return Math.floor(Math.abs(this.system.attributes.hardness.value)) || 0;
    }

    /**
     * A currently naive measurement of this creature's reach
     * @param [context.action] The action context of the reach measurement. Interact actions don't consider weapons.
     * @param [context.weapon] The "weapon," literal or otherwise, used in an attack-reach measurement
     */
    override getReach({ action = "interact", weapon = null }: GetReachParameters = {}): number {
        const baseReach = this.attributes.reach.base;
        const weaponReach = weapon?.isOfType("melee") ? weapon.reach : null;

        if (action === "interact" || this.type === "familiar") {
            return baseReach;
        } else if (typeof weaponReach === "number") {
            return weaponReach;
        } else {
            const attacks: { item: ItemPF2e<ActorPF2e>; ready: boolean }[] = weapon
                ? [{ item: weapon, ready: true }]
                : (this.system.actions ?? []);
            const readyAttacks = attacks.filter((a) => a.ready);
            const traitsFromItems = readyAttacks.map((a) => new Set(a.item.system.traits?.value ?? []));
            if (traitsFromItems.length === 0) return baseReach;

            const reaches = traitsFromItems.map((traits): number => {
                if (setHasElement(traits, "reach")) return baseReach + 5;

                const reachNPattern = /^reach-\d{1,3}$/;
                return Number([...traits].find((t) => reachNPattern.test(t))?.replace("reach-", "")) || baseReach;
            });

            return Math.max(...reaches);
        }
    }

    override get visionLevel(): VisionLevel {
        const senses = this.system.perception.senses;

        const senseTypes = senses.map((sense) => sense.type);
        return this.hasCondition("blinded")
            ? VisionLevels.BLINDED
            : senseTypes.includes("darkvision") || senseTypes.includes("greater-darkvision")
              ? VisionLevels.DARKVISION
              : senseTypes.includes("low-light-vision")
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
        return this.statuses.has("dead");
    }

    /** Whether the creature emits sound: overridable by AE-like */
    override get emitsSound(): boolean {
        return this.system.attributes.emitsSound;
    }

    get isSpellcaster(): boolean {
        const itemTypes = this.itemTypes;
        return itemTypes.spellcastingEntry.length > 0 && itemTypes.spell.length > 0;
    }

    get wornArmor(): ArmorPF2e<this> | null {
        return this.itemTypes.armor.find((a) => a.isEquipped) ?? null;
    }

    /** Get the held shield of most use to the wielder */
    override get heldShield(): ShieldPF2e<this> | null {
        const heldShields = this.itemTypes.shield.filter((s) => s.isEquipped);
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

    /** Retrieve percpetion and spellcasting statistics */
    override getStatistic(slug: SaveType | SkillSlug | "perception"): Statistic<this>;
    override getStatistic(slug: string, options?: { item: ItemPF2e | null }): Statistic<this> | null;
    override getStatistic(slug: string, options?: { item: ItemPF2e | null }): Statistic | null {
        const item = options?.item;
        switch (slug) {
            case "perception":
                return this.perception;
            case "spell":
            case "spell-attack":
                return (
                    this.spellcasting.contents
                        .flatMap((sc) => sc.statistic ?? [])
                        .sort((a, b) => b.mod - a.mod)
                        .shift() ?? null
                );
            case "spell-dc":
                return (
                    this.spellcasting.contents
                        .flatMap((sc) => sc.statistic ?? [])
                        .sort((a, b) => b.dc.value - a.dc.value)
                        .shift() ?? null
                );
            case "counteract":
                if (
                    item?.isOfType("spell") &&
                    item.actor?.uuid === this.uuid &&
                    item.spellcasting instanceof SpellcastingEntryPF2e
                ) {
                    return item.spellcasting.counteraction;
                }
                return (
                    this.spellcasting
                        .values()
                        .filter((sc) => sc instanceof SpellcastingEntryPF2e)
                        .map((sc) => sc.counteraction)
                        .reduce((best, candidate) => (candidate.mod > best.mod ? candidate : best)) ?? null
                );
        }

        if (slug in CONFIG.PF2E.magicTraditions) {
            const bestSpellcasting =
                this.spellcasting
                    .filter((c) => c.tradition === slug)
                    .flatMap((s) => s.statistic ?? [])
                    .sort((a, b) => b.check.mod - a.check.mod)
                    .shift() ?? null;
            return bestSpellcasting ?? null;
        }

        return (
            this.spellcasting.contents.flatMap((sc) => sc.statistic ?? []).find((s) => s.slug === slug) ??
            super.getStatistic(slug)
        );
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this.parties ??= new Set();
        const getSystem = () => this.system;
        this.movement = {
            speeds: {} as CreatureSpeeds<this>,
            get terrain() {
                return fu.deepClone(getSystem().movement.terrain);
            },
        };
        super._initialize(options);
    }

    override prepareData(): void {
        super.prepareData();

        // Add spell collections from spell consumables if a matching spellcasting ability is found
        const spellConsumables = this.itemTypes.consumable.filter(
            (c) => ["scroll", "wand"].includes(c.category) && c.isIdentified && !c.isStowed,
        );
        for (const consumable of spellConsumables) {
            const spell = consumable.embeddedSpell;
            if (!spell?.id) continue;
            const ability = this.spellcasting
                .filter((e): e is SpellcastingEntry<this> => !!e.statistic && e.canCast(spell, { origin: consumable }))
                .reduce(
                    (best: SpellcastingEntry<this> | null, e) =>
                        best === null ? e : e.statistic.dc.value > best.statistic.dc.value ? e : best,
                    null,
                );
            if (ability) {
                const collectionId = `${consumable.id}-casting`;
                const itemCasting = new ItemSpellcasting({
                    id: collectionId,
                    name: consumable.name,
                    actor: this,
                    statistic: ability.statistic,
                    tradition: ability.tradition ?? spell.traditions.first() ?? null,
                    original: ability,
                    castPredicate: new Predicate([`item:id:${consumable.id}`, `spell:id:${spell.id}`]),
                });
                spell.system.location.value = itemCasting.id;
                const collection = new SpellCollection(itemCasting);
                collection.set(spell.id, spell);
                this.spellcasting.set(itemCasting.id, itemCasting);
                this.spellcasting.collections.set(collectionId, collection);
            }
        }

        for (const party of this.parties) {
            party.reset({ actor: true });
        }
    }

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.flags.pf2e.rollOptions.all["self:creature"] = true;

        this.system.perception = fu.mergeObject({ attribute: "wis", senses: [] }, this.system.perception);
        this.system.resources ??= {};

        const attributes = this.system.attributes;
        attributes.ac = fu.mergeObject({ attribute: "dex" }, attributes.ac);
        attributes.hardness ??= { value: 0 };
        attributes.flanking.canFlank = this.type !== "familiar";
        attributes.flanking.flankable = true;
        attributes.flanking.offGuardable = true;

        // Start with a baseline reach of 5 feet except for familiars: melee attacks with reach can adjust it
        const baseReach = this.type === "familiar" ? 0 : 5;
        attributes.reach = { base: baseReach, manipulate: baseReach };

        if (this.system.initiative) {
            this.system.initiative.tiebreakPriority = this.hasPlayerOwner ? 2 : 1;
        }

        // Bless raw custom modifiers as `ModifierPF2e`s
        const customModifiers = (this.system.customModifiers ??= {});
        for (const selector of Object.keys(customModifiers)) {
            customModifiers[selector] = customModifiers[selector].map(
                (rawModifier: RawModifier) => new ModifierPF2e(rawModifier),
            );
        }

        // Set base actor-shield data for PCs NPCs
        if (this.isOfType("character", "npc")) {
            attributes.shield = {
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

        // Movement data
        type PartialMovementData = Omit<CreatureMovementData, "speeds"> & {
            speeds: DeepPartial<CreatureMovementData["speeds"]>;
        };
        type WithPartialMovement = Omit<CreatureSystemData, "movement"> & { movement: PartialMovementData };
        const withPartialMovement: WithPartialMovement = this.system;
        withPartialMovement.movement = {
            speeds: {},
            terrain: { difficult: { ignored: [] }, greater: { ignored: [] } },
        };
        const sourceSystemData = this._source.system.attributes;
        const legacyData = "speed" in sourceSystemData ? sourceSystemData.speed : { value: 25, otherSpeeds: [] };
        for (const speed of [{ type: "land", value: legacyData.value }, ...legacyData.otherSpeeds] as const) {
            const { type, value } = speed;
            withPartialMovement.movement.speeds[type] = { value, base: value };
        }
        if ("speed" in this.system.attributes) delete this.system.attributes.speed;
        Object.defineProperty(this.system.attributes, "speed", {
            get: () => {
                const message = [
                    "You are accessing CreaturePF2e#system#attributes#speed.",
                    "Movement data is now found at #system#movement#speeds.",
                ].join(" ");
                fu.logCompatibilityWarning(message, { since: "7.5.0", until: "8.0.0" });
                const speeds = this.system.movement.speeds;
                const land = speeds.land;
                const otherSpeeds = Object.entries(speeds)
                    .filter(
                        (e): e is [string, SpeedStatisticTraceData] =>
                            !!e[1] && ["burrow", "fly", "swim"].includes(e[0]),
                    )
                    .map(([, s]) => ({ value: s.base, total: s.value, breakdown: s.breakdown }));
                return {
                    value: land.base,
                    total: land.value,
                    breakdown: land.breakdown,
                    otherSpeeds,
                };
            },
        });
    }

    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();

        for (const changeEntries of Object.values(this.system.autoChanges)) {
            changeEntries?.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
        }

        this.rollOptions.all[`self:mode:${this.modeOfBeing}`] = true;

        // Character specific general ways to bump proficiency
        if (this.isOfType("character")) {
            const spellcasting = this.system.proficiencies.spellcasting;

            // PC1 p.298, When you gain an innate spell, you become trained in the spell attack modifier
            // and spell DC statistics. At 12th level, these proficiencies increase to expert.
            const actualSpellcasting = this.spellcasting.filter((e) => e.system && !e.system?.proficiency.slug);
            if (actualSpellcasting.some((e) => e.category === "innate")) {
                spellcasting.rank = Math.max(spellcasting.rank, this.level >= 12 ? 2 : 1) as ZeroToFour;
            } else if (actualSpellcasting.length) {
                // If you can cast spells using spellcasting prof, you logically need to be at least trained
                spellcasting.rank ||= 1;
            }
        }

        // Base spellcasting proficiency (later extended to add attribute modifiers)
        this.spellcasting.base = new Statistic(this, {
            slug: "base-spellcasting",
            label: "PF2E.Actor.Creature.Spellcasting.Label",
            rank: this.isOfType("character") ? this.system.proficiencies.spellcasting.rank : 1,
            domains: ["all", "spell-attack-dc"],
            check: { type: "attack-roll" },
        });
    }

    protected override prepareDataFromItems(): void {
        this.spellcasting ??= new ActorSpellcasting(this);
        this.spellcasting.initialize([...this.itemTypes.spellcastingEntry, new RitualSpellcasting(this)]);
        super.prepareDataFromItems();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        // Set labels for attributes
        if (this.system.abilities) {
            for (const [shortForm, data] of R.entries(this.system.abilities)) {
                data.label = CONFIG.PF2E.abilities[shortForm];
                data.shortLabel = `PF2E.AbilityId.${shortForm}`;
            }
        }

        const { attributes, rollOptions } = this;

        // Add creature-specific self: roll options
        if (this.hitPoints.negativeHealing) {
            rollOptions.all["self:negative-healing"] = true;
        }

        // Set whether this actor is wearing armor
        rollOptions.all["self:armored"] = !!this.wornArmor && this.wornArmor.category !== "unarmored";

        // Set whether the actor's shield is raised
        if (attributes.shield?.raised && !attributes.shield.broken && !attributes.shield.destroyed) {
            rollOptions.all["self:shield:raised"] = true;
        }

        // Set whether this creature emits sound
        attributes.emitsSound = !this.isDead;

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

        // Clamp certain core resources
        const resources = this.system.resources;
        if (resources.focus) {
            resources.focus.max = Math.floor(Math.clamp(resources.focus.max, 0, resources.focus.cap)) || 0;
        }
        for (const key of ["heroPoints", "mythicPoints", "focus"]) {
            const resource = resources[key];
            if (resource) {
                resource.value = Math.floor(Math.clamp(resource.value, 0, resource.max)) || 0;
            }
        }

        // Disallow creatures not in either alliance to flank
        if (this.system.details.alliance === null) {
            attributes.flanking.canFlank = false;
        }

        imposeEncumberedCondition(this);
    }

    /** Extract and add custom modifiers. */
    protected override prepareSynthetics(): void {
        super.prepareSynthetics();
        for (const [selector, modifiers] of Object.entries(this.system.customModifiers)) {
            const syntheticModifiers = (this.synthetics.modifiers[selector] ??= []);
            syntheticModifiers.push(...modifiers.map((m) => () => m));
        }
    }

    /**
     * Changes the carry type of an item (held/worn/stowed/etc) and/or regrips/reslots
     * @param item    The item
     * @param options Options to specify how the item should be carried
     */
    async changeCarryType(
        item: PhysicalItemPF2e<CreaturePF2e>,
        { carryType, handsHeld = 0, inSlot = false }: ChangeCarryTypeOptions,
    ): Promise<void> {
        const usage = item.system.usage;
        if (carryType === "stowed") {
            const container = item.actor.itemTypes.backpack.find(
                (c) => c !== item.container && !isContainerCycle(item, c),
            );
            if (container) await item.actor.stowOrUnstow(item, container);
        } else if (carryType === "attached" && item.quantity > 0) {
            await new ItemAttacher({ item }).resolveSelection();
        } else {
            const equipped: EquippedData = {
                carryType: carryType,
                handsHeld: carryType === "held" ? handsHeld : 0,
                inSlot: usage.type === "worn" && usage.where ? inSlot : undefined,
            };

            const updates: (DeepPartial<ArmorSource> & { _id: string })[] = [];

            if (isEquipped(usage, equipped) && item.isOfType("armor")) {
                // see if they have another set of armor equipped
                const wornArmors = this.itemTypes.armor.filter((a) => a !== item && a.isEquipped);
                for (const armor of wornArmors) {
                    updates.push({ _id: armor.id, system: { equipped: { inSlot: false } } });
                }
            } else if (equipped.carryType !== "held" && item.isOfType("weapon") && item.shield?.isRaised) {
                // Stop raising the shield when the weapon it is attached to becomes stowed
                const effectIds = item.actor.itemTypes.effect
                    .filter(
                        (e) =>
                            e.slug === "effect-raise-a-shield" ||
                            (e.slug === "effect-cover" &&
                                e.system.traits.otherTags.includes("tower-shield") &&
                                item.shield?.isTowerShield),
                    )
                    .map((e) => e.id);
                await this.deleteEmbeddedDocuments("Item", effectIds);
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
     * Roll a Dying Recovery Check
     */
    async rollRecovery(event?: PointerEvent): Promise<Rolled<CheckRoll> | null> {
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

        return new Statistic(this, {
            slug: "dying-recovery",
            label: "PF2E.Check.Specific.Recovery",
            check: { type: "flat-check" },
        }).roll({
            ...eventToRollParams(event, { type: "check" }),
            dc,
            extraRollNotes: notes,
        });
    }

    /** Returns a resource by slug or by key */
    override getResource(resource: string): ResourceData | null {
        const slug = sluggify(resource);
        const key = sluggify(resource, { camel: "dromedary" });

        // Temporary compatibility hack until the big migration
        if (slug === "infused-reagents" && this.isOfType("character")) {
            const data = this.system.resources.crafting.infusedReagents;
            return {
                ...data,
                slug,
                label: "PF2E.CraftingTab.Alchemical.InfusedReagents",
            };
        }

        const data = this.system.resources[key];
        if (!data) return null;

        const label = tupleHasValue(CORE_RESOURCES, slug)
            ? game.i18n.localize(`PF2E.Actor.Resource.${key.capitalize()}`)
            : (this.synthetics.resources[key]?.label ?? key.capitalize());
        return { ...data, slug, label };
    }

    /**
     * Updates a resource. Redirects to special resources if needed.
     * Accepts resource slugs in both kebab and dromedary, to handle token updates and direct ones.
     */
    async updateResource(resource: string, value: number, { render }: { render?: boolean } = {}): Promise<void> {
        const slug = sluggify(resource);
        const key = sluggify(resource, { camel: "dromedary" });
        if (key === "investiture") return;

        // Temporary compatibility hack until the big migration
        if (slug === "infused-reagents" && this.isOfType("character")) {
            value = Math.clamp(value, 0, this.system.resources.crafting.infusedReagents.max);
            await this.update({ [`system.resources.crafting.infusedReagents.value`]: value });
            return;
        }

        const resources = this.system.resources;
        const special = this.synthetics.resources[key];
        if (special) {
            await special.update(Math.clamp(value, 0, special.max), { render });
        } else if (!!resources?.[key] && tupleHasValue(CORE_RESOURCES, slug)) {
            value = Math.clamp(value, 0, resources[key]?.max ?? 0);
            await this.update({ [`system.resources.${key}.value`]: value }, { render });
        }
    }

    /**
     * Prepare this creature's movement data
     * @param modifiers Modifiers in addition to those extracted
     */
    prepareMovementData(modifiers: ModifierPF2e[] = []): void {
        const baseSpeed = this.system.movement.speeds.land.base;
        const landSpeed = new SpeedStatistic(this, { type: "land", base: baseSpeed, modifiers });
        this.system.movement.speeds.land.value = landSpeed.value;
        this.system.movement.speeds.land.base = landSpeed.base;
        const rollOptions = this.getRollOptions(["all-speeds", "speed", "land-speed"]);
        const otherSpeeds = Object.fromEntries(
            MOVEMENT_TYPES.filter((t) => t !== "land").map((type) => {
                const fromSynthetics = R.filter(
                    this.synthetics.movementTypes[type]?.map((d) => d({ test: rollOptions })) ?? [],
                    R.isNonNull,
                );
                const syntheticSpeed = R.firstBy(fromSynthetics, [(s) => s.value ?? 0, "desc"]);
                if (!syntheticSpeed && !this.system.movement.speeds[type]) return [type, null];
                const systemDataSpeed = this.system.movement.speeds[type] ?? { value: -Infinity, source: null };
                const selected =
                    syntheticSpeed && syntheticSpeed.value > systemDataSpeed.value ? syntheticSpeed : systemDataSpeed;
                if (selected === syntheticSpeed && syntheticSpeed.derivedFromLand) {
                    const domain = (this.flags.pf2e.rollOptions[`${type}-speed`] ??= {});
                    domain["derived-from-land"] = true;
                }
                const base = selected.value;
                const statistic = syntheticSpeed?.derivedFromLand
                    ? landSpeed.extend({ type })
                    : new SpeedStatistic(this, { type, base, source: selected.source });
                return [type, statistic];
            }),
        ) as { [T in Exclude<MovementType, "land">]: SpeedStatistic<this, T> | null };
        const travelSpeed = landSpeed.extend({ type: "travel" });
        this.movement.speeds = { [landSpeed.type]: landSpeed, ...otherSpeeds, [travelSpeed.type]: travelSpeed };
        this.system.movement.speeds = R.mapValues(
            this.movement.speeds,
            (s) => s?.getTraceData() ?? null,
        ) as CreatureMovementData["speeds"];
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Remove any features linked to a to-be-deleted ABC item */
    override deleteEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        ids: string[],
        operation?: Partial<DatabaseDeleteOperation<this>>,
    ): Promise<ActiveEffectPF2e<this>[] | ItemPF2e<this>[]>;
    override deleteEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        ids: string[],
        operation?: Partial<DatabaseDeleteOperation<this>>,
    ): Promise<foundry.abstract.Document<this>[]> {
        if (embeddedName === "Item") {
            const items = ids.map((id) => this.items.get(id));
            const linked = items.flatMap((item) => item?.getLinkedItems?.() ?? []);
            ids.push(...linked.map((item) => item.id));
        }

        return super.deleteEmbeddedDocuments(embeddedName, [...new Set(ids)], operation);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: CreatureUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        const isFullReplace = !((options.diff ?? true) && (options.recursive ?? true));
        if (!changed.system || isFullReplace) {
            return super._preUpdate(changed, options, user);
        }

        // Clamp hit points
        const currentHP = this.hitPoints;
        const changedHP = changed.system.attributes?.hp;
        if (typeof changedHP?.value === "number") {
            changedHP.value = options.allowHPOverage
                ? Math.max(0, changedHP.value)
                : Math.clamp(changedHP.value, 0, Math.max(currentHP.max - currentHP.unrecoverable, 0));
        }
        if (changed.system.attributes?.hp?.temp !== undefined) {
            const inputValue = changed.system.attributes.hp.temp;
            changed.system.attributes.hp.temp = Math.floor(Math.clamp(Number(inputValue) || 0, 0, 999));
        }

        // Clamp focus points
        const focusUpdate = changed.system.resources?.focus;
        if (focusUpdate && this.system.resources) {
            if (typeof focusUpdate.max === "number") {
                focusUpdate.max = Math.clamp(focusUpdate.max, 0, 3);
            }

            const updatedPoints = Number(focusUpdate.value ?? this.system.resources.focus?.value) || 0;
            const enforcedMax = (Number(focusUpdate.max) || this.system.resources.focus?.max) ?? 0;
            focusUpdate.value = Math.clamp(updatedPoints, 0, enforcedMax);
        }

        // Remove special resources from update data
        if (changed.system.resources) {
            for (const special of Object.keys(this.synthetics.resources)) {
                if (special in changed.system.resources) {
                    delete (changed.system.resources as CreatureResources)[special];
                }
            }
        }

        // Preserve alignment traits if not exposed
        const traitChanges = changed.system.traits;
        if (R.isPlainObject(traitChanges) && Array.isArray(traitChanges.value)) {
            const sourceAlignmentTraits = this._source.system.traits?.value.filter(
                (t) => ["good", "evil", "lawful", "chaotic"].includes(t) && !(t in CONFIG.PF2E.creatureTraits),
            );
            traitChanges.value = R.unique([traitChanges.value, sourceAlignmentTraits].flat()).filter(R.isTruthy).sort();
        }

        return super._preUpdate(changed, options, user);
    }

    /** Overriden to notify the party that an update is required */
    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
        super._onDelete(options, userId);

        for (const party of this.parties) {
            const updater = party.primaryUpdater;
            if (game.user === updater) {
                party.removeMembers(this.uuid);
            } else if (!updater) {
                // If there is no updater, we can't update the party, so re-render so it displays correctly.
                // Future party updates will clean up the stale reference.
                party.reset();
                ui.actors.render();
            }
        }
    }
}

interface CreaturePF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: CreatureSource;
    system: CreatureSystemData;

    get hitPoints(): HitPointsSummary;

    /** Extend `DatabaseUpdateOperation` for creatures */
    update(
        data: Record<string, unknown>,
        operation?: Partial<CreatureUpdateOperation<TParent>>,
    ): Promise<this | undefined>;

    /** See implementation in class */
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<ActiveEffectPF2e<this>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Item",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<ItemPF2e<this>[]>;
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<ActiveEffectPF2e<this>[] | ItemPF2e<this>[]>;

    deleteEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        ids: string[],
        operation?: Partial<DatabaseDeleteOperation<this>>,
    ): Promise<ActiveEffectPF2e<this>[]>;
    deleteEmbeddedDocuments(
        embeddedName: "Item",
        ids: string[],
        operation?: Partial<DatabaseDeleteOperation<this>>,
    ): Promise<ItemPF2e<this>[]>;
    deleteEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        ids: string[],
        operation?: Partial<DatabaseDeleteOperation<this>>,
    ): Promise<ActiveEffectPF2e<this>[] | ItemPF2e<this>[]>;
}

interface ChangeCarryTypeOptions {
    /** Whether the item is held, worn, stowed, etc. */
    carryType: ItemCarryType;
    /** If requesting to hold the item, how many holds with which to holt it */
    handsHeld?: ZeroToTwo;
    /** If requesting to wear the item, and the item has a usage slot, whether the item to be in the slot */
    inSlot?: boolean;
}

export { CreaturePF2e };
