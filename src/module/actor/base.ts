import { AttackItem, AttackRollContext, StrikeRollContext, StrikeRollContextParams } from "@actor/types";
import { ActorAlliance, ActorDimensions, AuraData, SaveType } from "@actor/types";
import { ArmorPF2e, ContainerPF2e, ItemPF2e, PhysicalItemPF2e, type ConditionPF2e } from "@item";
import { ActionTrait } from "@item/action/data";
import { ConditionSlug } from "@item/condition/data";
import { isCycle } from "@item/container/helpers";
import { ItemSourcePF2e, ItemType, PhysicalItemSource } from "@item/data";
import { hasInvestedProperty } from "@item/data/helpers";
import { EffectFlags, EffectSource } from "@item/effect/data";
import type { ActiveEffectPF2e } from "@module/active-effect";
import { ChatMessagePF2e } from "@module/chat-message";
import { Size } from "@module/data";
import { preImportJSON } from "@module/doc-helpers";
import { RuleElementSynthetics } from "@module/rules";
import { RuleElementPF2e } from "@module/rules/rule-element/base";
import { RollOptionRuleElement } from "@module/rules/rule-element/roll-option";
import { LocalizePF2e } from "@module/system/localize";
import { UserPF2e } from "@module/user";
import { TokenDocumentPF2e } from "@scene";
import { DicePF2e } from "@scripts/dice";
import { Statistic } from "@system/statistic";
import { ErrorPF2e, isObject, objectHasKey, traitSlugToObject, tupleHasValue } from "@util";
import type { CreaturePF2e } from "./creature";
import { VisionLevel, VisionLevels } from "./creature/data";
import { GetReachParameters, ModeOfBeing } from "./creature/types";
import { ActorDataPF2e, ActorSourcePF2e, ActorType } from "./data";
import { ActorFlagsPF2e, BaseTraitsData, PrototypeTokenPF2e, RollOptionFlags, StrikeData } from "./data/base";
import { ActorSizePF2e } from "./data/size";
import { calculateRangePenalty, getRangeIncrement, migrateActorSource } from "./helpers";
import { ActorInventory } from "./inventory";
import { ItemTransfer } from "./item-transfer";
import { ActorSheetPF2e } from "./sheet/base";
import { ActorSpellcasting } from "./spellcasting";
import { TokenEffect } from "./token-effect";
import { CREATURE_ACTOR_TYPES } from "./values";

/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 * @category Actor
 */
class ActorPF2e extends Actor<TokenDocumentPF2e, ItemTypeMap> {
    /** Has this actor gone through at least one cycle of data preparation? */
    private initialized?: true;

    /** A separate collection of owned physical items for convenient access */
    inventory!: ActorInventory;

    /** A separate collection of owned spellcasting entries for convenience */
    spellcasting!: ActorSpellcasting;

    /** Rule elements drawn from owned items */
    rules!: RuleElementPF2e[];

    synthetics!: RuleElementSynthetics;

    /** Saving throw statistics */
    saves?: { [K in SaveType]?: Statistic };

    /** Data from rule elements for auras this actor may be emanating */
    auras!: Map<string, AuraData>;

    /** Conditions this actor has */
    conditions!: Map<ConditionSlug, ConditionPF2e>;

    /** A cached copy of `Actor#itemTypes`, lazily regenerated every data preparation cycle */
    private _itemTypes?: { [K in keyof ItemTypeMap]: Embedded<ItemTypeMap[K]>[] };

    constructor(data: PreCreate<ActorSourcePF2e>, context: ActorConstructorContextPF2e = {}) {
        if (context.pf2e?.ready) {
            // Set module art if available
            if (context.pack && data._id) {
                const art = game.pf2e.system.moduleArt.map.get(`Compendium.${context.pack}.${data._id}`);
                if (art) {
                    data.img = art.actor;
                    const tokenArt =
                        typeof art.token === "string"
                            ? { img: art.token }
                            : { ...art.token, flags: { pf2e: { autoscale: false } } };
                    data.prototypeToken = mergeObject(data.prototypeToken ?? {}, tokenArt);
                }
            }

            super(data, context);
        } else {
            context.pf2e = mergeObject(context.pf2e ?? {}, { ready: true });
            const ActorConstructor = CONFIG.PF2E.Actor.documentClasses[data.type];
            return ActorConstructor ? new ActorConstructor(data, context) : new ActorPF2e(data, context);
        }
    }

    /** Cache the return data before passing it to the caller */
    override get itemTypes(): { [K in keyof ItemTypeMap]: Embedded<ItemTypeMap[K]>[] } {
        return (this._itemTypes ??= super.itemTypes);
    }

    get allowedItemTypes(): (ItemType | "physical")[] {
        return ["condition", "effect"];
    }

    /** The compendium source ID of the actor **/
    get sourceId(): ActorUUID | null {
        return this.flags.core?.sourceId ?? null;
    }

    /** The recorded schema version of this actor, updated after each data migration */
    get schemaVersion(): number | null {
        return Number(this.system.schema?.version) || null;
    }

    /** Get an active GM or, failing that, a player who can update this actor */
    get primaryUpdater(): UserPF2e | null {
        const activeUsers = game.users.filter((u) => u.active);

        // 1. The first active GM, sorted by ID
        const firstGM = activeUsers
            .filter((u) => u.isGM)
            .sort((a, b) => (a.id > b.id ? 1 : -1))
            .shift();
        if (firstGM) return firstGM;

        // 2. The user with this actor assigned
        const primaryPlayer = this.isToken ? null : activeUsers.find((u) => u.character?.id === this.id);
        if (primaryPlayer) return primaryPlayer;

        // 3. Anyone who can update the actor
        const firstUpdater = game.users
            .filter((u) => this.canUserModify(u, "update"))
            .sort((a, b) => (a.id > b.id ? 1 : -1))
            .shift();
        return firstUpdater ?? null;
    }

    /** Shortcut to system-data attributes */
    get attributes(): this["system"]["attributes"] {
        return this.system.attributes;
    }

    get hitPoints(): HitPointsSummary | null {
        const { hp } = this.system.attributes;
        if (!hp) return null;

        return {
            value: hp.value,
            max: hp.max,
            temp: hp.temp,
            negativeHealing: hp.negativeHealing,
        };
    }

    get traits(): Set<string> {
        return new Set(this.system.traits.value);
    }

    get level(): number {
        return this.system.details.level.value;
    }

    get size(): Size {
        return this.system.traits.size.value;
    }

    /**
     * With the exception of vehicles, actor heights aren't specified. For the purpose of three-dimensional
     * token-distance measurement, however, the system will generally treat actors as cubes.
     */
    get dimensions(): ActorDimensions {
        const { size } = this.system.traits;
        return {
            length: size.length,
            width: size.width,
            height: Math.min(size.length, size.width),
        };
    }

    /**
     * Whether the actor can see, given its token placement in the current scene.
     * A meaningful implementation is found in `CreaturePF2e`.
     */
    get canSee(): boolean {
        return true;
    }

    /** Whether this actor can execute actions: meaningful implementations are found in `CreaturePF2e`. */
    get canAct(): boolean {
        return true;
    }

    /** Whether this actor can attack: meaningful implementations are found in `CreaturePF2e` and `HazardPF2e`. */
    get canAttack(): boolean {
        return false;
    }

    get isDead(): boolean {
        const deathIcon = game.settings.get("pf2e", "deathIcon");
        if (this.token) return this.token.overlayEffect === deathIcon;
        const tokens = this.getActiveTokens(true, true);
        return tokens.length > 0 && tokens.every((t) => t.overlayEffect === deathIcon);
    }

    get modeOfBeing(): ModeOfBeing {
        const { traits } = this;
        return traits.has("undead") ? "undead" : traits.has("construct") ? "construct" : "living";
    }

    get visionLevel(): VisionLevel {
        return VisionLevels.NORMAL;
    }

    /** Does this creature emit sound? False unless a subclass overrides it */
    get emitsSound(): boolean {
        return false;
    }

    get rollOptions(): RollOptionFlags {
        return this.flags.pf2e.rollOptions;
    }

    /** Get the actor's held shield. Meaningful implementation in `CreaturePF2e`'s override. */
    get heldShield(): Embedded<ArmorPF2e> | null {
        return null;
    }

    /** Most actor types can host rule elements */
    get canHostRuleElements(): boolean {
        return true;
    }

    get alliance(): ActorAlliance {
        return this.system.details.alliance;
    }

    /** Add effect icons from effect items and rule elements */
    override get temporaryEffects(): TemporaryEffect[] {
        const tokenIcon = (condition: ConditionPF2e): ImagePath => {
            const folder = CONFIG.PF2E.statusEffects.iconDir;
            return `${folder}${condition.slug}.webp`;
        };
        const conditionTokenIcons = this.itemTypes.condition.map((condition) => tokenIcon(condition));
        const conditionTokenEffects = Array.from(new Set(conditionTokenIcons)).map((icon) => new TokenEffect(icon));

        const effectTokenEffects = this.itemTypes.effect
            .filter((effect) => effect.system.tokenIcon?.show)
            .filter((effect) => !effect.unidentified || game.user.isGM)
            .map((effect) => new TokenEffect(effect.img));

        return super.temporaryEffects
            .concat(this.system.tokenEffects)
            .concat(conditionTokenEffects)
            .concat(effectTokenEffects);
    }

    /** A means of checking this actor's type without risk of circular import references */
    isOfType(type: "creature"): this is CreaturePF2e;
    isOfType<T extends ActorType>(
        ...types: T[]
    ): this is InstanceType<ConfigPF2e["PF2E"]["Actor"]["documentClasses"][T]>;
    isOfType<T extends "creature" | ActorType>(
        ...types: T[]
    ): this is CreaturePF2e | InstanceType<ConfigPF2e["PF2E"]["Actor"]["documentClasses"][Exclude<T, "creature">]>;
    isOfType<T extends ActorType | "creature">(...types: T[]): boolean {
        return types.some((t) => (t === "creature" ? tupleHasValue(CREATURE_ACTOR_TYPES, this.type) : this.type === t));
    }

    /** Whether this actor is an ally of the provided actor */
    isAllyOf(actor: ActorPF2e): boolean {
        return this.alliance !== null && this.alliance === actor.alliance;
    }

    /** Get roll options from this actor's effects, traits, and other properties */
    getSelfRollOptions(prefix: "self" | "target" | "origin" = "self"): string[] {
        const { rollOptions } = this;
        return Object.keys(rollOptions.all).flatMap((o) =>
            o.startsWith("self:") && rollOptions.all[o] ? o.replace(/^self/, prefix) : []
        );
    }

    /** The actor's reach: a meaningful implementation is found in `CreaturePF2e` and `HazardPF2e`. */
    getReach(_options: GetReachParameters): number {
        return 0;
    }

    /** Create a clone of this actor to recalculate its statistics with temporary roll options included */
    getContextualClone(rollOptions: string[]): this {
        const rollOptionsAll = rollOptions.reduce(
            (options: Record<string, boolean>, option) => ({ ...options, [option]: true }),
            {}
        );
        return this.clone({ flags: { pf2e: { rollOptions: { all: rollOptionsAll } } } }, { keepId: true });
    }

    /** Apply effects from an aura: will later be expanded to handle effects from measured templates */
    async applyAreaEffects(aura: AuraData, { origin }: { origin: ActorPF2e }): Promise<void> {
        if (game.user !== this.primaryUpdater) return;

        const toCreate: EffectSource[] = [];
        for (const data of aura.effects) {
            if (this.itemTypes.effect.some((e) => e.sourceId === data.uuid)) {
                continue;
            }

            if (data.affects === "allies" && this.isAllyOf(origin)) {
                const effect = await fromUuid(data.uuid);
                if (!(effect instanceof ItemPF2e && effect.isOfType("effect"))) {
                    console.warn(`Effect from ${data.uuid} not found`);
                    continue;
                }

                const flags: DeepPartial<EffectFlags> = {
                    core: { sourceId: effect.uuid },
                    pf2e: {
                        aura: {
                            slug: aura.slug,
                            origin: origin.uuid,
                            removeOnExit: data.removeOnExit,
                        },
                    },
                };

                const source = mergeObject(effect.toObject(), { flags });
                source.system.level.value = data.level ?? source.system.level.value;
                source.system.duration.unit = "unlimited";
                source.system.duration.expiry = null;
                toCreate.push(source);
            }
        }

        if (toCreate.length > 0) {
            await this.createEmbeddedDocuments("Item", toCreate);
        }
    }

    /** Review `removeOnExit` aura effects and remove any that no longer apply */
    async checkAreaEffects(): Promise<void> {
        if (!canvas.ready || game.user !== this.primaryUpdater) return;

        const thisTokens = this.getActiveTokens(false, true);
        const toDelete: string[] = [];
        const toKeep: string[] = [];

        for (const effect of this.itemTypes.effect) {
            const auraData = effect.flags.pf2e.aura;
            if (!auraData?.removeOnExit) continue;

            const auraToken = await (async (): Promise<TokenDocumentPF2e | null> => {
                const document = await fromUuid(auraData.origin);
                if (document instanceof TokenDocumentPF2e) {
                    return document;
                } else if (document instanceof ActorPF2e) {
                    return document.getActiveTokens(false, true).shift() ?? null;
                }
                return null;
            })();

            const aura = auraToken?.auras.get(auraData.slug);

            // Main sure this isn't an identically-slugged aura with different effects
            const effects = auraToken?.actor?.auras.get(auraData.slug)?.effects ?? [];
            const auraHasEffect = effects.some((e) => e.uuid === effect.sourceId);

            for (const token of thisTokens) {
                if (auraHasEffect && aura?.containsToken(token)) {
                    toKeep.push(effect.id);
                } else {
                    toDelete.push(effect.id);
                }
            }

            // If no tokens for this actor remain in the scene, always remove the effect
            if (thisTokens.length === 0) {
                toDelete.push(effect.id);
            }
        }

        // In case there are multiple tokens for this actor, avoid deleting aura effects if at least one token is
        // exposed to the aura
        const finalToDelete = toDelete.filter((id) => !toKeep.includes(id));
        if (finalToDelete.length > 0) {
            await this.deleteEmbeddedDocuments("Item", finalToDelete);
        }
    }

    /**
     * As of Foundry 0.8: All subclasses of ActorPF2e need to use this factory method rather than having their own
     * overrides, since Foundry itself will call `ActorPF2e.create` when a new actor is created from the sidebar.
     */
    static override async createDocuments<T extends foundry.abstract.Document>(
        this: ConstructorOf<T>,
        data?: PreCreate<T["_source"]>[],
        context?: DocumentModificationContext<T>
    ): Promise<T[]>;
    static override async createDocuments(
        data: PreCreate<ActorSourcePF2e>[] = [],
        context: DocumentModificationContext<ActorPF2e> = {}
    ): Promise<Actor[]> {
        // Set additional defaults, some according to actor type
        for (const datum of [...data]) {
            const { linkToActorSize } = datum.prototypeToken?.flags?.pf2e ?? {};
            const merged = mergeObject(datum, {
                ownership: datum.ownership ?? { default: CONST.DOCUMENT_PERMISSION_LEVELS.NONE },
                prototypeToken: {
                    flags: {
                        // Sync token dimensions with actor size?
                        pf2e: {
                            linkToActorSize: linkToActorSize ?? !["hazard", "loot"].includes(datum.type),
                        },
                    },
                },
            });

            // Set default token dimensions for familiars and vehicles
            const dimensionMap: { [K in ActorType]?: number } = { familiar: 0.5, vehicle: 2 };
            merged.prototypeToken.height ??= dimensionMap[datum.type] ?? 1;
            merged.prototypeToken.width ??= merged.prototypeToken.height;

            switch (merged.type) {
                case "character":
                case "familiar":
                    merged.ownership.default = CONST.DOCUMENT_PERMISSION_LEVELS.LIMITED;
                    // Default characters and their minions to having tokens with vision and an actor link
                    merged.prototypeToken.actorLink = true;
                    merged.prototypeToken.vision = true;
                    break;
                case "loot":
                    // Make loot actors linked and interactable
                    merged.prototypeToken.actorLink = true;
                    merged.ownership.default = CONST.DOCUMENT_PERMISSION_LEVELS.LIMITED;
                    break;
            }

            const migrated = await migrateActorSource(datum);
            data.splice(data.indexOf(datum), 1, migrated);
        }

        return super.createDocuments(data, context);
    }

    protected override _initialize(): void {
        this.rules = [];
        this.conditions = new Map();
        this.auras = new Map();

        const preparationWarnings: Set<string> = new Set();
        this.synthetics = {
            criticalSpecalizations: { standard: [], alternate: [] },
            damageDice: { damage: [] },
            degreeOfSuccessAdjustments: {},
            dexterityModifierCaps: [],
            modifierAdjustments: { all: [], damage: [] },
            movementTypes: {},
            multipleAttackPenalties: {},
            rollNotes: {},
            rollSubstitutions: {},
            rollTwice: {},
            senses: [],
            statisticsModifiers: { all: [], damage: [] },
            strikeAdjustments: [],
            strikes: new Map(),
            striking: {},
            targetMarks: new Map(),
            tokenOverrides: {},
            weaponPotency: {},
            preparationWarnings: {
                add: (warning: string) => preparationWarnings.add(warning),
                flush: foundry.utils.debounce(() => {
                    for (const warning of preparationWarnings) {
                        console.warn(warning);
                    }
                    preparationWarnings.clear();
                }, 10), // 10ms also handles separate module executions
            },
        };

        super._initialize();

        this.initialized = true;

        if (game._documentsReady) {
            this.synthetics.preparationWarnings.flush();
        }
    }

    /** Prepare token data derived from this actor, refresh Effects Panel */
    override prepareData(): void {
        delete this._itemTypes;

        super.prepareData();

        this.preparePrototypeToken();
        if (this.initialized && canvas.ready) {
            const thisTokenIsControlled = canvas.tokens.controlled.some((t) => t.actor === this);
            if (game.user.character === this || thisTokenIsControlled) {
                game.pf2e.effectPanel.refresh();
            }
        }
    }

    /** Prepare baseline ephemeral data applicable to all actor types */
    override prepareBaseData(): void {
        super.prepareBaseData();
        this.system.tokenEffects = [];
        this.system.autoChanges = {};
        this.system.attributes.flanking = { canFlank: false, canGangUp: [], flankable: false, flatFootable: false };
        this.system.toggles = [];

        const traits: BaseTraitsData<string> | undefined = this.system.traits;
        if (traits?.size) traits.size = new ActorSizePF2e(traits.size);

        // Setup the basic structure of pf2e flags with roll options
        this.flags.pf2e = mergeObject(this.flags.pf2e ?? {}, {
            rollOptions: {
                all: { [`self:type:${this.type}`]: true },
            },
        });

        this.setEncounterRollOptions();
    }

    /** Prepare the physical-item collection on this actor, item-sibling data, and rule elements */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();
        const physicalItems: Embedded<PhysicalItemPF2e>[] = this.items.filter(
            (item) => item instanceof PhysicalItemPF2e
        );
        this.inventory = new ActorInventory(this, physicalItems);

        const spellcastingEntries = this.itemTypes.spellcastingEntry;
        this.spellcasting = new ActorSpellcasting(this, spellcastingEntries);

        // Track all effects on this actor
        for (const effect of this.itemTypes.effect) {
            game.pf2e.effectTracker.register(effect);
        }

        this.prepareDataFromItems();
    }

    /** Prepare data among owned items as well as actor-data preparation performed by items */
    protected prepareDataFromItems(): void {
        for (const item of this.items) {
            item.prepareSiblingData?.();
            item.prepareActorData?.();
        }

        this.rules = this.prepareRuleElements();
    }

    protected prepareRuleElements(): RuleElementPF2e[] {
        return this.items.contents
            .flatMap((item) => item.prepareRuleElements())
            .filter((rule) => !rule.ignored)
            .sort((elementA, elementB) => elementA.priority - elementB.priority);
    }

    /** Collect all rule element output */
    protected prepareSynthetics(): void {
        // Rule elements
        for (const rule of this.rules.filter((r) => !r.ignored)) {
            try {
                rule.beforePrepareData?.();
            } catch (error) {
                // Ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onBeforePrepareData on rule element ${rule}.`, error);
            }
        }
    }

    /** Set traits as roll options */
    override prepareDerivedData(): void {
        const { rollOptions } = this;
        for (const trait of this.traits) {
            rollOptions.all[`self:trait:${trait}`] = true;
        }
    }

    /** Set defaults for this actor's prototype token */
    private preparePrototypeToken(): void {
        this.prototypeToken.flags = mergeObject(
            { pf2e: { linkToActorSize: !["hazard", "loot"].includes(this.type) } },
            this.prototypeToken.flags
        );
        TokenDocumentPF2e.prepareSize(this.prototypeToken, this);
    }

    /** If there is an active encounter, set roll options for it and this actor's participant */
    setEncounterRollOptions(): void {
        const encounter = game.ready ? game.combat : null;
        if (!encounter?.started) return;

        const participants = encounter.combatants.contents;
        const participant = this.token?.combatant ?? participants.find((c) => c.actor === this);
        if (!participant || participant.initiative === null) return;

        const rollOptionsAll = this.rollOptions.all;
        rollOptionsAll["encounter"] = true;
        rollOptionsAll[`encounter:round:${encounter.round}`] = true;
        rollOptionsAll[`encounter:turn:${encounter.turn + 1}`] = true;
        rollOptionsAll["self:participant:own-turn"] = encounter.combatant?.actor === this;

        const rank = [...participants].reverse().indexOf(participant) + 1;
        rollOptionsAll[`self:participant:initiative:roll:${participant.initiative}`] = true;
        rollOptionsAll[`self:participant:initiative:rank:${rank}`] = true;
    }

    /* -------------------------------------------- */
    /*  Rolls                                       */
    /* -------------------------------------------- */

    getStrikeRollContext<I extends AttackItem>(params: StrikeRollContextParams<I>): StrikeRollContext<this, I> {
        const targetToken = Array.from(game.user.targets).find((t) => t.actor?.isOfType("creature", "hazard")) ?? null;

        const selfToken =
            canvas.tokens.controlled.find((t) => t.actor === this) ?? this.getActiveTokens().shift() ?? null;
        const reach = params.item.isOfType("melee")
            ? params.item.reach
            : params.item.isOfType("weapon")
            ? this.getReach({ action: "attack", weapon: params.item })
            : null;

        const selfOptions = this.getRollOptions(params.domains ?? []);
        if (targetToken && typeof reach === "number" && selfToken?.isFlanking(targetToken, { reach })) {
            selfOptions.push("self:flanking");
        }

        const selfActor = params.viewOnly ? this : this.getContextualClone(selfOptions);
        const actions: StrikeData[] = selfActor.system.actions?.flatMap((a) => [a, a.altUsages ?? []].flat()) ?? [];

        const selfItem: AttackItem =
            params.viewOnly || params.item.isOfType("spell")
                ? params.item
                : actions
                      .map((a): AttackItem => a.item)
                      .find((weapon) => {
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

        const traitSlugs: ActionTrait[] = [
            "attack" as const,
            // CRB p. 544: "Due to the complexity involved in preparing bombs, Strikes to throw alchemical bombs gain
            // the manipulate trait."
            selfItem.isOfType("weapon") && selfItem.baseType === "alchemical-bomb" ? ("manipulate" as const) : [],
        ].flat();
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
        if (targetToken && targetOptions.length > 0) {
            const mark = this.synthetics.targetMarks.get(targetToken.document.uuid);
            if (mark) targetOptions.push(`target:mark:${mark}`);
        }

        const rollOptions = new Set([
            ...params.options,
            ...selfOptions,
            ...targetOptions,
            ...selfItem.getRollOptions("item"),
            // Backward compatibility for predication looking for an "attack" trait by its lonesome
            "attack",
        ]);

        // Calculate distance and range increment, set as a roll option
        const distance = selfToken && targetToken && !!canvas.grid ? selfToken.distanceTo(targetToken) : null;
        if (typeof distance === "number") rollOptions.add(`target:distance:${distance}`);

        const rangeIncrement = getRangeIncrement(selfItem, distance);
        if (rangeIncrement) rollOptions.add(`target:range-increment:${rangeIncrement}`);

        const self = {
            actor: selfActor,
            token: selfToken?.document ?? null,
            item: selfItem as I,
            modifiers: [],
        };

        const target =
            targetActor && targetToken && distance !== null
                ? { actor: targetActor, token: targetToken.document, distance, rangeIncrement }
                : null;

        return {
            options: rollOptions,
            self,
            target,
            traits,
        };
    }

    /**
     * Calculates attack roll target data including the target's DC.
     * All attack rolls have the "all" and "attack-roll" domains and the "attack" trait,
     * but more can be added via the options.
     */
    getAttackRollContext<I extends AttackItem>(params: StrikeRollContextParams<I>): AttackRollContext<this, I> {
        const context = this.getStrikeRollContext(params);
        const targetActor = context.target?.actor;
        const rangeIncrement = context.target?.rangeIncrement ?? null;

        const rangePenalty = calculateRangePenalty(this, rangeIncrement, params.domains, context.options);
        if (rangePenalty) context.self.modifiers.push(rangePenalty);

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

    /**
     * Roll a Attribute Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     */
    rollAttribute(event: JQuery.Event, attributeName: string) {
        if (!objectHasKey(this.system.attributes, attributeName)) {
            throw ErrorPF2e(`Unrecognized attribute "${attributeName}"`);
        }

        const attribute = this.attributes[attributeName];
        if (!(isObject(attribute) && "value" in attribute)) return;

        const parts = ["@mod", "@itemBonus"];
        const configAttributes = CONFIG.PF2E.attributes;
        if (isObject(attribute) && objectHasKey(configAttributes, attributeName)) {
            const flavor = `${game.i18n.localize(configAttributes[attributeName])} Check`;
            // Call the roll helper utility
            DicePF2e.d20Roll({
                event,
                parts,
                data: { mod: attribute.value },
                title: flavor,
                speaker: ChatMessage.getSpeaker({ actor: this }),
            });
        }
    }

    /** Toggle the provided roll option (swapping it from true to false or vice versa). */
    async toggleRollOption(domain: string, option: string, value?: boolean): Promise<boolean | null>;
    async toggleRollOption(
        domain: string,
        option: string,
        itemId: string | null,
        value?: boolean
    ): Promise<boolean | null>;
    async toggleRollOption(
        domain: string,
        option: string,
        itemId: string | boolean | null = null,
        value?: boolean
    ): Promise<boolean | null> {
        value = typeof itemId === "boolean" ? itemId : value ?? !this.rollOptions[domain]?.[option];
        if (typeof itemId === "string") {
            return RollOptionRuleElement.toggleOption({ actor: this, domain, option, itemId, value });
        } else {
            /** If no itemId is provided, attempt to find the first matching Rule Element with the exact Domain and Option. */
            const match = this.rules.find(
                (rule) => rule instanceof RollOptionRuleElement && rule.domain === domain && rule.option === option
            );

            /** If a matching item is found toggle this option. */
            const itemId = match?.item.id ?? null;
            return RollOptionRuleElement.toggleOption({ actor: this, domain, option, itemId, value });
        }
    }

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     *
     * If the attribute bar is for hp and the change is in delta form, defer to the applyDamage method. Otherwise, do nothing special
     * @param attribute The attribute path
     * @param value     The target attribute value
     * @param isDelta   Whether the number represents a relative change (true) or an absolute change (false)
     * @param isBar     Whether the new value is part of an attribute bar, or just a direct value
     */
    override async modifyTokenAttribute(
        attribute: string,
        value: number,
        isDelta = false,
        isBar = true
    ): Promise<this> {
        const token = this.getActiveTokens(false, true).shift();
        const isDamage = isDelta || (value === 0 && !!token?.combatant);
        if (token && attribute === "attributes.hp" && isDamage) {
            const damage = value === 0 ? this.hitPoints?.value ?? 0 : -value;
            return this.applyDamage(damage, token);
        }
        return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     * @param damage The amount of damage inflicted
     * @param token The applicable token for this actor
     * @param shieldBlockRequest Whether the user has toggled the Shield Block button
     */
    async applyDamage(damage: number, token: TokenDocumentPF2e, shieldBlockRequest = false): Promise<this> {
        const { hitPoints } = this;
        if (!hitPoints) return this;
        damage = Math.trunc(damage); // Round damage and healing (negative values) toward zero

        // Calculate damage to hit points and shield
        const translations = LocalizePF2e.translations.PF2E.Actor.ApplyDamage;
        const { attributes } = this;
        const actorShield = "shield" in attributes ? attributes.shield : null;
        const shieldBlock =
            actorShield && shieldBlockRequest
                ? ((): boolean => {
                      const warnings = LocalizePF2e.translations.PF2E.Actions.RaiseAShield;
                      if (actorShield.broken) {
                          ui.notifications.warn(
                              game.i18n.format(warnings.ShieldIsBroken, { actor: token.name, shield: actorShield.name })
                          );
                          return false;
                      } else if (actorShield.destroyed) {
                          ui.notifications.warn(
                              game.i18n.format(warnings.ShieldIsDestroyed, {
                                  actor: token.name,
                                  shield: actorShield.name,
                              })
                          );
                          return false;
                      } else if (!actorShield.raised) {
                          ui.notifications.warn(game.i18n.format(translations.ShieldNotRaised, { actor: token.name }));
                          return false;
                      } else {
                          return true;
                      }
                  })()
                : false;

        const shieldHardness = shieldBlock ? actorShield?.hardness ?? 0 : 0;
        const absorbedDamage = Math.min(shieldHardness, Math.abs(damage));
        const shieldDamage = shieldBlock ? Math.min(actorShield?.hp.value ?? 0, Math.abs(damage) - absorbedDamage) : 0;

        const hpUpdate = this.calculateHealthDelta({
            hp: hitPoints,
            sp: this.isOfType("character") ? this.attributes.sp : undefined,
            delta: damage - absorbedDamage,
        });
        const hpDamage = hpUpdate.totalApplied;

        // Make updates
        if (shieldDamage > 0) {
            const shield = (() => {
                const item = this.items.get(actorShield?.itemId ?? "");
                return item?.isOfType("armor") ? item : null;
            })();
            await shield?.update(
                { "system.hp.value": shield.hitPoints.value - shieldDamage },
                { render: hpDamage === 0 }
            );
        }
        if (hpDamage !== 0) {
            await this.update(hpUpdate.updates);
        }
        const deadAtZero = ["npcsOnly", "both"].includes(game.settings.get("pf2e", "automation.actorsDeadAtZero"));
        if (this.isOfType("npc") && deadAtZero && this.isDead !== token.combatant?.isDefeated) {
            token.combatant?.toggleDefeated();
        }

        // Send chat message
        const hpStatement = ((): string => {
            // This would be a nested ternary, except prettier thoroughly mangles it
            if (damage === 0) return translations.TakesNoDamage;
            if (damage > 0) {
                return absorbedDamage > 0
                    ? hpDamage > 0
                        ? translations.DamagedForNShield
                        : translations.ShieldAbsorbsAll
                    : translations.DamagedForN;
            }
            return hpDamage < 0 ? translations.HealedForN : translations.AtFullHealth;
        })();

        const updatedShield = "shield" in this.attributes ? this.attributes.shield : null;
        const shieldStatement =
            updatedShield && shieldDamage > 0
                ? updatedShield.broken
                    ? translations.ShieldDamagedForNBroken
                    : updatedShield.destroyed
                    ? translations.ShieldDamagedForNDestroyed
                    : translations.ShieldDamagedForN
                : null;
        const statements = [hpStatement, shieldStatement]
            .filter((s): s is string => !!s)
            .map((s) =>
                game.i18n.format(s, { actor: token.name, hpDamage: Math.abs(hpDamage), absorbedDamage, shieldDamage })
            )
            .join(" ");

        await ChatMessagePF2e.create({
            speaker: { alias: token.name, token: token.id ?? null },
            content: `<p>${statements}</p>`,
            type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
            whisper:
                game.settings.get("pf2e", "metagame_secretDamage") && !token.actor?.hasPlayerOwner
                    ? ChatMessagePF2e.getWhisperRecipients("GM").map((u) => u.id)
                    : [],
        });

        return this;
    }

    isLootableBy(user: UserPF2e) {
        return this.canUserModify(user, "update");
    }

    /**
     * Moves an item to another actor's inventory.
     * @param targetActor Instance of actor to be receiving the item.
     * @param item        Instance of the item being transferred.
     * @param quantity    Number of items to move.
     * @param containerId Id of the container that will contain the item.
     * @return The target item, if the transfer is successful, or otherwise `null`.
     */
    async transferItemToActor(
        targetActor: ActorPF2e,
        item: Embedded<ItemPF2e>,
        quantity: number,
        containerId?: string,
        newStack = false
    ): Promise<Embedded<PhysicalItemPF2e> | null> {
        if (!(item instanceof PhysicalItemPF2e)) {
            throw ErrorPF2e("Only physical items (with quantities) can be transfered between actors");
        }
        const container = targetActor.inventory.get(containerId ?? "");
        if (!(!container || container instanceof ContainerPF2e)) {
            throw ErrorPF2e("containerId refers to a non-container");
        }

        // Loot transfers can be performed by non-owners when a GM is online */
        const gmMustTransfer = (source: ActorPF2e, target: ActorPF2e): boolean => {
            const bothAreOwned = source.isOwner && target.isOwner;
            const sourceIsOwnedOrLoot = source.isLootableBy(game.user);
            const targetIsOwnedOrLoot = target.isLootableBy(game.user);
            return !bothAreOwned && sourceIsOwnedOrLoot && targetIsOwnedOrLoot;
        };
        if (gmMustTransfer(this, targetActor)) {
            const source = { tokenId: this.token?.id, actorId: this.id, itemId: item.id };
            const target = { tokenId: targetActor.token?.id, actorId: targetActor.id };
            await new ItemTransfer(source, target, quantity, container?.id).request();
            return null;
        }

        if (!this.canUserModify(game.user, "update")) {
            ui.notifications.error(game.i18n.localize("PF2E.ErrorMessage.CantMoveItemSource"));
            return null;
        }
        if (!targetActor.canUserModify(game.user, "update")) {
            ui.notifications.error(game.i18n.localize("PF2E.ErrorMessage.CantMoveItemDestination"));
            return null;
        }

        // Limit the amount of items transfered to how many are actually available.
        quantity = Math.min(quantity, item.quantity);

        // Remove the item from the source if we are transferring all of it; otherwise, subtract the appropriate number.
        const newQuantity = item.quantity - quantity;
        const removeFromSource = newQuantity < 1;

        if (removeFromSource) {
            await item.delete();
        } else {
            await item.update({ "system.quantity": newQuantity });
        }

        const newItemData = item.toObject();
        newItemData.system.quantity = quantity;
        newItemData.system.equipped.carryType = "worn";
        if (hasInvestedProperty(newItemData)) {
            newItemData.system.equipped.invested = item.traits.has("invested") ? false : null;
        }

        return targetActor.addToInventory(newItemData, container, newStack);
    }

    async addToInventory(
        itemSource: PhysicalItemSource,
        container?: Embedded<ContainerPF2e>,
        newStack?: boolean
    ): Promise<Embedded<PhysicalItemPF2e> | null> {
        // Stack with an existing item if possible
        const stackItem = this.findStackableItem(this, itemSource);
        if (!newStack && stackItem && stackItem.type !== "backpack") {
            const stackQuantity = stackItem.quantity + itemSource.system.quantity;
            await stackItem.update({ "system.quantity": stackQuantity });
            return stackItem;
        }

        // Otherwise create a new item
        const result = await ItemPF2e.create(itemSource, { parent: this });
        if (!result) {
            return null;
        }
        const movedItem = this.inventory.get(result.id);
        if (!movedItem) return null;
        await this.stowOrUnstow(movedItem, container);

        return movedItem;
    }

    /** Find an item already owned by the actor that can stack with the to-be-transferred item */
    findStackableItem(actor: ActorPF2e, itemSource: ItemSourcePF2e): Embedded<PhysicalItemPF2e> | null {
        // Prevent upstream from mutating property descriptors
        const testItem = new ItemPF2e(deepClone(itemSource));
        const stackCandidates = actor.inventory.filter(
            (stackCandidate) =>
                !stackCandidate.isInContainer &&
                testItem instanceof PhysicalItemPF2e &&
                stackCandidate.isStackableWith(testItem)
        );

        if (stackCandidates.length === 0) {
            return null;
        } else if (stackCandidates.length > 1) {
            // Prefer stacking with unequipped items
            const notEquipped = stackCandidates.filter((item) => !item.isEquipped);
            return notEquipped.length > 0 ? notEquipped[0] : stackCandidates[0];
        } else {
            return stackCandidates[0];
        }
    }

    /** Move an item into the inventory into or out of a container */
    async stowOrUnstow(item: Embedded<PhysicalItemPF2e>, container?: Embedded<ContainerPF2e>): Promise<void> {
        if (!container) {
            await item.update({
                "system.containerId": null,
                "system.equipped.carryType": "worn",
                "system.equipped.handsHeld": 0,
                "system.equipped.inSlot": false,
            });
        } else if (!isCycle(item, container)) {
            const carryType = container.stowsItems ? "stowed" : "worn";
            await item.update({
                "system.containerId": container.id,
                "system.equipped.carryType": carryType,
                "system.equipped.handsHeld": 0,
                "system.equipped.inSlot": false,
            });
        }
    }

    /** Determine actor updates for applying damage/healing across temporary hit points, stamina, and then hit points */
    private calculateHealthDelta(args: {
        hp: { max: number; value: number; temp: number };
        sp?: { max: number; value: number };
        delta: number;
    }) {
        const updates: Record<string, number> = {};
        const { hp, sp, delta } = args;
        const appliedToTemp = ((): number => {
            if (!hp.temp || delta <= 0) return 0;
            const applied = Math.min(hp.temp, delta);
            updates["system.attributes.hp.temp"] = Math.max(hp.temp - applied, 0);

            return applied;
        })();

        const appliedToSP = ((): number => {
            const staminaEnabled = !!sp && game.settings.get("pf2e", "staminaVariant");
            if (!staminaEnabled || delta <= 0) return 0;
            const remaining = delta - appliedToTemp;
            const applied = Math.min(sp.value, remaining);
            updates["system.attributes.sp.value"] = Math.max(sp.value - applied, 0);

            return applied;
        })();

        const appliedToHP = ((): number => {
            const remaining = delta - appliedToTemp - appliedToSP;
            const applied = remaining > 0 ? Math.min(hp.value, remaining) : Math.max(hp.value - hp.max, remaining);
            updates["system.attributes.hp.value"] = Math.max(hp.value - applied, 0);

            return applied;
        })();
        const totalApplied = appliedToTemp + appliedToSP + appliedToHP;

        return { updates, totalApplied };
    }

    static getActionGraphics(actionType: string, actionCount?: number): { imageUrl: ImagePath; actionGlyph: string } {
        let actionImg: number | string = 0;
        if (actionType === "action") actionImg = actionCount ?? 1;
        else if (actionType === "reaction") actionImg = "reaction";
        else if (actionType === "free") actionImg = "free";
        else if (actionType === "passive") actionImg = "passive";
        const graphics: Record<string, { imageUrl: ImagePath; actionGlyph: string }> = {
            1: { imageUrl: "systems/pf2e/icons/actions/OneAction.webp", actionGlyph: "A" },
            2: { imageUrl: "systems/pf2e/icons/actions/TwoActions.webp", actionGlyph: "D" },
            3: { imageUrl: "systems/pf2e/icons/actions/ThreeActions.webp", actionGlyph: "T" },
            free: { imageUrl: "systems/pf2e/icons/actions/FreeAction.webp", actionGlyph: "F" },
            reaction: { imageUrl: "systems/pf2e/icons/actions/Reaction.webp", actionGlyph: "R" },
            passive: { imageUrl: "systems/pf2e/icons/actions/Passive.webp", actionGlyph: "" },
        };
        if (objectHasKey(graphics, actionImg)) {
            return {
                imageUrl: graphics[actionImg].imageUrl,
                actionGlyph: graphics[actionImg].actionGlyph,
            };
        } else {
            return {
                imageUrl: "systems/pf2e/icons/actions/Empty.webp",
                actionGlyph: "",
            };
        }
    }

    /**
     * Retrieve all roll option from the requested domains. Micro-optimized in an excessively verbose for-loop.
     * @param domains The domains of discourse from which to pull options. Always includes the "all" domain.
     */
    getRollOptions(domains: string[] = []): string[] {
        const withAll = Array.from(new Set(["all", ...domains]));
        const { rollOptions } = this;
        const toReturn: Set<string> = new Set();

        for (const domain of withAll) {
            for (const [option, value] of Object.entries(rollOptions[domain] ?? {})) {
                if (value) toReturn.add(option);
            }
        }

        return Array.from(toReturn).sort();
    }

    /** This allows @actor.level and such to work for roll macros */
    override getRollData(): Record<string, unknown> {
        return { ...duplicate(super.getRollData()), actor: this };
    }

    /* -------------------------------------------- */
    /* Conditions                                   */
    /* -------------------------------------------- */

    /**
     * Get a condition on this actor, returning:
     *   - the highest-valued if there are multiple of a valued condition
     *   - the longest-lasting if there are multiple of a condition with a duration
     *   - the last applied if any are present and are neither valued nor with duration
     *   - otherwise `null`
     * @param slug the slug of a core condition (subject to change when user-created conditions are introduced)
     * @param [options.all=false] return all conditions of the requested type in the order described above
     */
    getCondition(
        slug: ConditionSlug,
        { all }: { all: boolean } = { all: false }
    ): Embedded<ConditionPF2e>[] | Embedded<ConditionPF2e> | null {
        const conditions = this.itemTypes.condition
            .filter((condition) => condition.slug === slug)
            .sort((conditionA, conditionB) => {
                const [valueA, valueB] = [conditionA.value ?? 0, conditionB.value ?? 0] as const;
                const [durationA, durationB] = [conditionA.duration ?? 0, conditionB.duration ?? 0] as const;

                return valueA > valueB
                    ? 1
                    : valueB < valueB
                    ? -1
                    : durationA > durationB
                    ? 1
                    : durationA < durationB
                    ? -1
                    : 0;
            });

        return all ? conditions : conditions[0] ?? null;
    }

    /**
     * Does this actor have any of the provided condition?
     * @param slugs Slug(s) of the queried condition(s)
     */
    hasCondition(...slugs: ConditionSlug[]): boolean {
        return slugs.some((s) => this.conditions.has(s));
    }

    /** Decrease the value of condition or remove it entirely */
    async decreaseCondition(
        conditionSlug: ConditionSlug | Embedded<ConditionPF2e>,
        { forceRemove }: { forceRemove: boolean } = { forceRemove: false }
    ): Promise<void> {
        // Find a valid matching condition if a slug was passed
        const condition = typeof conditionSlug === "string" ? this.getCondition(conditionSlug) : conditionSlug;
        if (!condition) return;

        const value = typeof condition.value === "number" ? Math.max(condition.value - 1, 0) : null;
        if (value !== null && !forceRemove) {
            await game.pf2e.ConditionManager.updateConditionValue(condition.id, this, value);
        } else {
            await this.deleteEmbeddedDocuments("Item", [condition.id]);
        }
    }

    /** Increase a valued condition, or create a new one if not present */
    async increaseCondition(
        conditionSlug: ConditionSlug | Embedded<ConditionPF2e>,
        { min, max = Number.MAX_SAFE_INTEGER }: { min?: number | null; max?: number | null } = {}
    ): Promise<ConditionPF2e | null> {
        const existing = typeof conditionSlug === "string" ? this.getCondition(conditionSlug) : conditionSlug;
        if (existing) {
            const conditionValue = (() => {
                if (existing.value === null) return null;
                if (min && max && min > max) throw ErrorPF2e(`min (${min}) > max (${max})`);
                return min && max
                    ? Math.clamped(existing.value + 1, min, max)
                    : max
                    ? Math.min(existing.value + 1, max)
                    : existing.value + 1;
            })();
            if (conditionValue === null || conditionValue > (max ?? 0)) return null;
            await game.pf2e.ConditionManager.updateConditionValue(existing.id, this, conditionValue);
            return existing;
        } else if (typeof conditionSlug === "string") {
            const conditionSource = game.pf2e.ConditionManager.getCondition(conditionSlug).toObject();
            const conditionValue =
                typeof conditionSource?.system.value.value === "number" && min && max
                    ? Math.clamped(conditionSource.system.value.value, min, max)
                    : null;
            conditionSource.system.value.value = conditionValue;
            const items = (await this.createEmbeddedDocuments("Item", [conditionSource])) as ConditionPF2e[];

            return items.shift() ?? null;
        }
        return null;
    }

    /** Toggle a condition as present or absent. If a valued condition is toggled on, it will be set to a value of 1. */
    async toggleCondition(conditionSlug: ConditionSlug): Promise<void> {
        if (this.hasCondition(conditionSlug)) {
            await this.decreaseCondition(conditionSlug, { forceRemove: true });
        } else {
            await this.increaseCondition(conditionSlug);
        }
    }

    /** Assess and pre-process this JSON data, ensuring it's importable and fully migrated */
    override async importFromJSON(json: string): Promise<this> {
        const processed = await preImportJSON(this, json);
        return processed ? super.importFromJSON(processed) : this;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preCreate(
        data: PreDocumentId<this["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        // Set default portrait and token images
        this._source.prototypeToken = mergeObject(this._source.prototypeToken ?? {}, { texture: {} });
        if (this._source.img === ActorPF2e.DEFAULT_ICON) {
            this._source.img =
                this._source.prototypeToken.texture.src = `systems/pf2e/icons/default-icons/${data.type}.svg`;
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: ActorUpdateContext<this>,
        user: UserPF2e
    ): Promise<void> {
        // Show floaty text when applying damage or healing
        const changedHP = changed.system?.attributes?.hp;
        const currentHP = this.hitPoints;
        if (typeof changedHP?.value === "number" && currentHP) {
            const hpChange = changedHP.value - currentHP.value;
            const levelChanged = !!changed.system?.details && "level" in changed.system.details;
            if (hpChange !== 0 && !levelChanged) options.damageTaken = hpChange;
        }

        // Run preUpdateActor rule element callbacks
        type WithPreUpdateActor = RuleElementPF2e & { preUpdateActor: NonNullable<RuleElementPF2e["preUpdateActor"]> };
        const rules = this.rules.filter((r): r is WithPreUpdateActor => !!r.preUpdateActor);
        if (rules.length > 0) {
            const clone = this.clone(changed, { keepId: true });
            this.flags.pf2e.rollOptions = clone.flags.pf2e.rollOptions;
            for (const rule of rules) {
                if (this.items.has(rule.item.id)) {
                    await rule.preUpdateActor();
                }
            }
        }

        await super._preUpdate(changed, options, user);
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: ActorUpdateContext<this>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);
        const hideFromUser =
            !this.hasPlayerOwner && !game.user.isGM && game.settings.get("pf2e", "metagame_secretDamage");
        if (options.damageTaken && !hideFromUser) {
            const tokens = super.getActiveTokens();
            for (const token of tokens) {
                token.showFloatyText(options.damageTaken);
            }
        }

        // If alliance has changed, reprepare token data to update the color of bounding boxes
        if (canvas.ready && changed.system?.details && "alliance" in changed.system.details) {
            for (const token of this.getActiveTokens(true, true)) {
                token.reset();
            }
        }
    }

    /** Unregister all effects possessed by this actor */
    protected override _onDelete(options: DocumentModificationContext<this>, userId: string): void {
        for (const effect of this.itemTypes.effect) {
            game.pf2e.effectTracker.unregister(effect);
        }
        super._onDelete(options, userId);
    }

    protected override _onEmbeddedDocumentChange(embeddedName: "Item" | "ActiveEffect"): void {
        // Send any accrued warnings to the console
        this.synthetics.preparationWarnings.flush();

        if (this.isToken) {
            return super._onEmbeddedDocumentChange(embeddedName);
        } else if (game.combat?.getCombatantByActor(this.id)) {
            // Needs to be done since `super._onEmbeddedDocumentChange` isn't called
            ui.combat.render();
        }

        // For linked tokens, replace parent method with alternative workflow to control canvas re-rendering
        const tokenDocs = this.getActiveTokens(true, true);
        for (const tokenDoc of tokenDocs) {
            tokenDoc.onActorEmbeddedItemChange();
        }
    }
}

interface ActorPF2e extends Actor<TokenDocumentPF2e, ItemTypeMap> {
    readonly data: ActorDataPF2e;

    readonly items: foundry.abstract.EmbeddedCollection<ItemPF2e>;

    readonly effects: foundry.abstract.EmbeddedCollection<ActiveEffectPF2e>;

    prototypeToken: PrototypeTokenPF2e;

    flags: ActorFlagsPF2e;

    _sheet: ActorSheetPF2e<this> | ActorSheet<this, ItemPF2e> | null;

    get sheet(): ActorSheetPF2e<this>;

    /** See implementation in class */
    createEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        data: PreCreate<foundry.data.ActiveEffectSource>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: "Item",
        data: PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ItemPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        data: PreCreate<foundry.data.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;

    /** See implementation in class */
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        updateData: EmbeddedDocumentUpdateData<ActiveEffectPF2e>[],
        options?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[]>;
    updateEmbeddedDocuments(
        embeddedName: "Item",
        updateData: EmbeddedDocumentUpdateData<ItemPF2e>[],
        options?: DocumentModificationContext
    ): Promise<ItemPF2e[]>;
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        updateData: EmbeddedDocumentUpdateData<ActiveEffectPF2e | ItemPF2e>[],
        options?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;

    getCondition(conditionType: ConditionSlug, { all }: { all: true }): Embedded<ConditionPF2e>[];
    getCondition(conditionType: ConditionSlug, { all }: { all: false }): Embedded<ConditionPF2e> | null;
    getCondition(conditionType: ConditionSlug): Embedded<ConditionPF2e> | null;
    getCondition(
        conditionType: ConditionSlug,
        { all }: { all: boolean }
    ): Embedded<ConditionPF2e>[] | Embedded<ConditionPF2e> | null;
}

interface ActorConstructorContextPF2e extends DocumentConstructionContext<ActorPF2e> {
    pf2e?: {
        ready?: boolean;
    };
}

type ItemTypeMap = {
    [K in ItemType]: InstanceType<ConfigPF2e["PF2E"]["Item"]["documentClasses"][K]>;
};

interface HitPointsSummary {
    value: number;
    max: number;
    temp: number;
    negativeHealing: boolean;
}

interface ActorUpdateContext<T extends ActorPF2e> extends DocumentUpdateContext<T> {
    damageTaken?: number;
}

export { ActorPF2e, HitPointsSummary, ActorUpdateContext };
