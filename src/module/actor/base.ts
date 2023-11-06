import {
    ActorAlliance,
    ActorDimensions,
    ActorInstances,
    ApplyDamageParams,
    AuraData,
    CheckContext,
    CheckContextParams,
    DamageRollContextParams,
    EmbeddedItemInstances,
    RollContext,
    RollContextParams,
    SaveType,
    UnaffectedType,
} from "@actor/types.ts";
import { AbstractEffectPF2e, ArmorPF2e, ContainerPF2e, ItemPF2e, ItemProxyPF2e, PhysicalItemPF2e } from "@item";
import { ActionTrait } from "@item/ability/types.ts";
import { AfflictionSource } from "@item/affliction/index.ts";
import { ItemSourcePF2e, ItemType, PhysicalItemSource, hasInvestedProperty } from "@item/base/data/index.ts";
import { ConditionKey, ConditionSlug, ConditionSource, type ConditionPF2e } from "@item/condition/index.ts";
import { PersistentDialog } from "@item/condition/persistent-damage-dialog.ts";
import { CONDITION_SLUGS } from "@item/condition/values.ts";
import { isCycle } from "@item/container/helpers.ts";
import { EffectFlags, EffectSource } from "@item/effect/data.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { RitualSpellcasting } from "@item/spellcasting-entry/rituals.ts";
import type { ActiveEffectPF2e } from "@module/active-effect.ts";
import type { TokenPF2e } from "@module/canvas/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { AppliedDamageFlag } from "@module/chat-message/index.ts";
import { Size } from "@module/data.ts";
import { preImportJSON } from "@module/doc-helpers.ts";
import { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";
import { extractEphemeralEffects, processPreUpdateActorHooks } from "@module/rules/helpers.ts";
import { RuleElementSynthetics } from "@module/rules/index.ts";
import { RuleElementPF2e } from "@module/rules/rule-element/base.ts";
import { RollOptionRuleElement } from "@module/rules/rule-element/roll-option.ts";
import type { UserPF2e } from "@module/user/document.ts";
import type { ScenePF2e } from "@scene/document.ts";
import { TokenDocumentPF2e } from "@scene/token-document/document.ts";
import { IWRApplicationData, applyIWR } from "@system/damage/iwr.ts";
import { DamageType } from "@system/damage/types.ts";
import { CheckDC } from "@system/degree-of-success.ts";
import type { ArmorStatistic, Statistic, StatisticCheck, StatisticDifficultyClass } from "@system/statistic/index.ts";
import { EnrichmentOptionsPF2e, TextEditorPF2e } from "@system/text-editor.ts";
import { ErrorPF2e, localizer, objectHasKey, setHasElement, sluggify, traitSlugToObject, tupleHasValue } from "@util";
import * as R from "remeda";
import { ActorConditions } from "./conditions.ts";
import { Abilities, CreatureSkills, VisionLevel, VisionLevels } from "./creature/data.ts";
import { GetReachParameters, ModeOfBeing } from "./creature/types.ts";
import {
    ActorFlagsPF2e,
    ActorSystemData,
    ActorTraitsData,
    PrototypeTokenPF2e,
    RollOptionFlags,
    StrikeData,
} from "./data/base.ts";
import { ActorSourcePF2e, ActorType } from "./data/index.ts";
import { Immunity, Resistance, Weakness } from "./data/iwr.ts";
import { ActorSizePF2e } from "./data/size.ts";
import {
    auraAffectsActor,
    calculateRangePenalty,
    checkAreaEffects,
    createEncounterRollOptions,
    findMatchingCheckContext,
    getRangeIncrement,
    isOffGuardFromFlanking,
    isReallyPC,
    migrateActorSource,
} from "./helpers.ts";
import { ActorInitiative } from "./initiative.ts";
import { ActorInventory } from "./inventory/index.ts";
import { ItemTransfer } from "./item-transfer.ts";
import { StatisticModifier } from "./modifiers.ts";
import { ActorSheetPF2e } from "./sheet/base.ts";
import { ActorSpellcasting } from "./spellcasting.ts";
import { TokenEffect } from "./token-effect.ts";
import { CREATURE_ACTOR_TYPES, SAVE_TYPES, SIZE_LINKABLE_ACTOR_TYPES, UNAFFECTED_TYPES } from "./values.ts";
import { v5 as UUIDv5 } from "uuid";

/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 * @category Actor
 */
class ActorPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends Actor<TParent> {
    /** Has this actor completed construction? */
    constructed = true;

    /** A UUIDv5 hash digest of the foundry UUID */
    declare signature: string;

    /** Handles rolling initiative for the current actor */
    declare initiative: ActorInitiative | null;

    /** A separate collection of owned physical items for convenient access */
    declare inventory: ActorInventory<this>;

    declare armorClass: StatisticDifficultyClass<ArmorStatistic> | null;

    /** A separate collection of owned spellcasting entries for convenience */
    declare spellcasting: ActorSpellcasting<this>;

    /** Rule elements drawn from owned items */
    declare rules: RuleElementPF2e[];

    declare synthetics: RuleElementSynthetics;

    /** Saving throw statistics */
    declare saves?: { [K in SaveType]?: Statistic };

    /** Data from rule elements for auras this actor may be emanating */
    declare auras: Map<string, AuraData>;

    /** A collection of this actor's conditions */
    declare conditions: ActorConditions<this>;

    declare perception?: Statistic;

    /** Skill checks for the actor if supported by the actor type */
    declare skills?: Partial<CreatureSkills>;

    /** A cached copy of `Actor#itemTypes`, lazily regenerated every data preparation cycle */
    private declare _itemTypes: EmbeddedItemInstances<this> | null;

    constructor(data: PreCreate<ActorSourcePF2e>, context: DocumentConstructionContext<TParent> = {}) {
        super(data, context);

        Object.defineProperties(this, {
            // Prevent object-recursing code from getting into `_itemTypes`,
            _itemTypes: {
                configurable: false,
                enumerable: false,
            },
            // Add debounced checkAreaEffects method
            checkAreaEffects: {
                value: foundry.utils.debounce(checkAreaEffects, 50),
            },
        });
    }

    static override getDefaultArtwork(actorData: foundry.documents.ActorSource): {
        img: ImageFilePath;
        texture: { src: ImageFilePath | VideoFilePath };
    } {
        const img: ImageFilePath = `systems/pf2e/icons/default-icons/${actorData.type}.svg`;
        return { img, texture: { src: img } };
    }

    /** Cache the return data before passing it to the caller */
    override get itemTypes(): EmbeddedItemInstances<this> {
        return (this._itemTypes ??= super.itemTypes as EmbeddedItemInstances<this>);
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
        return Number(this.system._migration?.version ?? this.system.schema?.version) || null;
    }

    /** Get an active GM or, failing that, a player who can update this actor */
    get primaryUpdater(): UserPF2e | null {
        // 1. The first active GM, sorted by ID
        const { activeGM } = game.users;
        if (activeGM) return activeGM;

        const activeUsers = game.users.filter((u) => u.active);
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

    get abilities(): Abilities | null {
        return null;
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
            unrecoverable: hp.unrecoverable,
            negativeHealing: hp.negativeHealing,
        };
    }

    get traits(): Set<string> {
        return new Set(this.system.traits?.value ?? []);
    }

    get level(): number {
        return this.system.details.level.value;
    }

    get size(): Size {
        return this.system.traits?.size.value ?? "med";
    }

    /**
     * With the exception of vehicles, actor heights aren't specified. For the purpose of three-dimensional
     * token-distance measurement, however, the system will generally treat actors as cubes.
     */
    get dimensions(): ActorDimensions {
        const size = this.system.traits?.size ?? new ActorSizePF2e({ value: "med" });
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

        const isPC = isReallyPC(this);

        return traits.has("undead") && !traits.has("eidolon") // Undead eidolons aren't undead
            ? "undead"
            : traits.has("construct") && !isPC && !traits.has("eidolon") // Construct eidolons aren't constructs
            ? "construct"
            : "living";
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
    get heldShield(): ArmorPF2e<this> | null {
        return null;
    }

    /** The actor's hardness: zero with the exception of some hazards and NPCs */
    get hardness(): number {
        return 0;
    }

    /** Most actor types can host rule elements */
    get canHostRuleElements(): boolean {
        return true;
    }

    get alliance(): ActorAlliance {
        return this.system.details.alliance;
    }

    get combatant(): CombatantPF2e<EncounterPF2e> | null {
        return game.combat?.combatants.find((c) => c.actor?.uuid === this.uuid) ?? null;
    }

    /** Add effect icons from effect items and rule elements */
    override get temporaryEffects(): TemporaryEffect[] {
        const fromConditions = this.conditions.active.map((c) => new TokenEffect(c));
        const fromEffects = this.itemTypes.effect
            .filter((e) => e.system.tokenIcon?.show && (e.isIdentified || game.user.isGM))
            .map((e) => new TokenEffect(e));

        return [super.temporaryEffects, fromConditions, fromEffects, this.synthetics.tokenEffectIcons].flat();
    }

    /** A means of checking this actor's type without risk of circular import references */
    isOfType<T extends "creature" | ActorType>(...types: T[]): this is ActorInstances<TParent>[T];
    isOfType(...types: string[]): boolean {
        return types.some((t) => (t === "creature" ? tupleHasValue(CREATURE_ACTOR_TYPES, this.type) : this.type === t));
    }

    /** Whether this actor is an ally of the provided actor */
    isAllyOf(actor: ActorPF2e): boolean {
        return this.alliance !== null && this !== actor && this.alliance === actor.alliance;
    }

    /** Whether this actor is an enemy of the provided actor */
    isEnemyOf(actor: ActorPF2e): boolean {
        return this.alliance !== null && actor.alliance !== null && this.alliance !== actor.alliance;
    }

    /** Whether this actor is immune to an effect of a certain type */
    isImmuneTo(effect: AbstractEffectPF2e | ConditionSource | EffectSource | ConditionSlug): boolean {
        if (!game.settings.get("pf2e", "automation.iwr")) return false;

        const item = typeof effect === "string" ? null : "parent" in effect ? effect : new ItemProxyPF2e(effect);
        const statements = new Set(item ? item.getRollOptions("item") : ["item:type:condition", `item:slug:${effect}`]);

        return this.attributes.immunities.some((i) => i.test(statements));
    }

    /** Whether this actor is affected by damage of a certain type despite lack of explicit immunity */
    isAffectedBy(damage: DamageType | ConditionPF2e): boolean {
        const damageType = objectHasKey(CONFIG.PF2E.damageTypes, damage)
            ? damage
            : damage.isOfType("condition")
            ? damage.system.persistent?.damageType ?? null
            : null;

        if (!setHasElement(UNAFFECTED_TYPES, damageType)) return true;

        const { traits } = this;
        const damageIsApplicable: Record<UnaffectedType, boolean> = {
            good: traits.has("evil"),
            evil: traits.has("good"),
            lawful: traits.has("chaotic"),
            chaotic: traits.has("lawful"),
            vitality: !!this.attributes.hp?.negativeHealing,
            void: !(this.modeOfBeing === "construct" || this.attributes.hp?.negativeHealing),
            bleed: this.modeOfBeing === "living",
            spirit: !(
                (this.modeOfBeing === "undead" && traits.has("mindless")) ||
                this.itemTypes.effect.some((e) => e.traits.has("possession"))
            ),
        };

        return damageIsApplicable[damageType];
    }

    /** Get (almost) any statistic by slug: handling expands in `ActorPF2e` subclasses */
    getStatistic(slug: string): Statistic | null {
        if (["armor", "ac"].includes(slug)) {
            return this.armorClass?.parent ?? null;
        }
        if (tupleHasValue(SAVE_TYPES, slug)) {
            return this.saves?.[slug] ?? null;
        }
        if (this.skills && objectHasKey(this.skills, slug)) {
            return this.skills[slug] ?? null;
        }

        return this.synthetics.statistics.get(slug) ?? null;
    }

    /** Get roll options from this actor's effects, traits, and other properties */
    getSelfRollOptions(prefix: "self" | "target" | "origin" = "self"): string[] {
        const { rollOptions } = this;
        return Object.keys(rollOptions.all).flatMap((o) =>
            o.startsWith("self:") && rollOptions.all[o] ? o.replace(/^self/, prefix) : [],
        );
    }

    /** The actor's reach: a meaningful implementation is found in `CreaturePF2e` and `HazardPF2e`. */
    getReach(_options: GetReachParameters): number {
        return 0;
    }

    /** Create a clone of this actor to recalculate its statistics with ephemeral effects and roll options included */
    getContextualClone(rollOptions: string[], ephemeralEffects: (ConditionSource | EffectSource)[] = []): this {
        const rollOptionsAll = rollOptions.reduce(
            (options: Record<string, boolean>, option) => ({ ...options, [option]: true }),
            {},
        );
        const applicableEffects = ephemeralEffects.filter((e) => !this.isImmuneTo(e));

        return this.clone(
            {
                items: [deepClone(this._source.items), applicableEffects].flat(),
                flags: { pf2e: { rollOptions: { all: rollOptionsAll } } },
            },
            { keepId: true },
        );
    }

    /** Apply effects from an aura: will later be expanded to handle effects from measured templates */
    async applyAreaEffects(aura: AuraData, origin: { actor: ActorPF2e; token: TokenDocumentPF2e }): Promise<void> {
        if (
            game.user !== this.primaryUpdater ||
            this.isOfType("party") ||
            !this.allowedItemTypes.includes("effect") ||
            origin.token.hidden
        ) {
            return;
        }

        const toCreate: (AfflictionSource | EffectSource)[] = [];
        const rollOptions = aura.effects.some((e) => e.predicate.length > 0)
            ? new Set([...origin.actor.getRollOptions(), ...this.getSelfRollOptions("target")])
            : new Set([]);

        for (const data of aura.effects.filter((e) => e.predicate.test(rollOptions))) {
            if (this.itemTypes.effect.some((e) => e.sourceId === data.uuid)) {
                continue;
            }

            if (auraAffectsActor(data, origin.actor, this)) {
                const effect = await fromUuid(data.uuid);
                if (!(effect instanceof ItemPF2e && effect.isOfType("affliction", "effect"))) {
                    console.warn(`Effect from ${data.uuid} not found`);
                    continue;
                }

                const flags: DeepPartial<EffectFlags> = {
                    core: { sourceId: effect.uuid },
                    pf2e: {
                        aura: {
                            slug: aura.slug,
                            origin: origin.actor.uuid,
                            removeOnExit: data.removeOnExit,
                        },
                    },
                };

                const source = mergeObject(effect.toObject(), { flags });
                source.system.level.value = aura.level ?? source.system.level.value;
                source.system.duration.unit = "unlimited";
                source.system.duration.expiry = null;
                // Only transfer traits from the aura if the effect lacks its own
                if (source.system.traits.value.length === 0) {
                    source.system.traits.value.push(...aura.traits);
                }

                source.system.context = {
                    target: null,
                    origin: {
                        actor: origin.actor.uuid,
                        token: origin.token.uuid,
                        item: null,
                        spellcasting: null,
                    },
                    roll: null,
                };

                for (const alteration of data.alterations) {
                    alteration.applyTo(source);
                }

                toCreate.push(source);
            }
        }

        if (toCreate.length > 0) {
            await this.createEmbeddedDocuments("Item", toCreate);
        }
    }

    /** Don't allow the user to create in development actor types. */
    static override createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
            types?: (ActorType | "creature")[];
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;
    static override async createDialog(
        data: { folder?: string | undefined } = {},
        context: {
            parent?: TokenDocumentPF2e | null;
            pack?: Collection<ActorPF2e<null>> | null;
            types?: (ActorType | "creature")[];
            [key: string]: unknown;
        } = {},
    ): Promise<Actor<TokenDocument<Scene | null> | null> | null> {
        const omittedTypes: ActorType[] = []; // still exists, since "army" will be here soon
        const original = game.system.documentTypes.Actor;
        try {
            game.system.documentTypes.Actor = R.difference(original, omittedTypes);

            if (context.types) {
                const validTypes = context.types ?? [];
                if (validTypes.includes("creature")) validTypes.push(...CREATURE_ACTOR_TYPES);
                game.system.documentTypes.Actor = game.system.documentTypes.Actor.filter((type) =>
                    tupleHasValue(validTypes, type),
                );
            }

            return super.createDialog(data, context);
        } finally {
            game.system.documentTypes.Actor = original;
        }
    }

    /**
     * As of Foundry 0.8: All subclasses of ActorPF2e need to use this factory method rather than having their own
     * overrides, since Foundry itself will call `ActorPF2e.create` when a new actor is created from the sidebar.
     */
    static override async createDocuments<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: (TDocument | PreCreate<TDocument["_source"]>)[],
        context?: DocumentModificationContext<TDocument["parent"]>,
    ): Promise<TDocument[]>;
    static override async createDocuments(
        data: (ActorPF2e | PreCreate<ActorSourcePF2e>)[] = [],
        context: DocumentModificationContext<TokenDocumentPF2e | null> = {},
    ): Promise<Actor<TokenDocument<Scene | null> | null>[]> {
        // Convert all `ActorPF2e`s to source objects
        const sources = data.map((d) => (d instanceof ActorPF2e ? d.toObject() : d));

        // Set additional defaults, some according to actor type
        for (const source of [...sources]) {
            const linkable = SIZE_LINKABLE_ACTOR_TYPES.has(source.type);
            const linkToActorSize = linkable && (source.prototypeToken?.flags?.pf2e?.linkToActorSize ?? true);
            const autoscale =
                linkable &&
                (source.prototypeToken?.flags?.pf2e?.autoscale ??
                    (linkToActorSize && game.settings.get("pf2e", "tokens.autoscale")));
            const merged = mergeObject(source, {
                ownership: source.ownership ?? { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
                prototypeToken: {
                    flags: {
                        // Sync token dimensions with actor size?
                        pf2e: { linkToActorSize, autoscale },
                    },
                },
            });

            // Set default token dimensions for familiars and vehicles
            const dimensionMap: { [K in ActorType]?: number } = { familiar: 0.5, vehicle: 2 };
            merged.prototypeToken.height ??= dimensionMap[source.type] ?? 1;
            merged.prototypeToken.width ??= merged.prototypeToken.height;

            switch (merged.type) {
                case "character":
                case "familiar":
                    merged.ownership.default = CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
                    // Default characters and their minions to having tokens with vision and an actor link
                    merged.prototypeToken.actorLink = true;
                    merged.prototypeToken.sight = { enabled: true };
                    break;
                case "loot":
                    // Make loot actors linked and interactable
                    merged.ownership.default = CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
                    merged.prototypeToken.actorLink = true;
                    merged.prototypeToken.sight = { enabled: false };
                    break;
                case "party":
                    // Party actors are linked and have observer ownership so that players can see during exploration
                    merged.ownership.default = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
                    merged.prototypeToken.actorLink = true;
                    merged.prototypeToken.sight = { enabled: true, range: 1 };
                    break;
            }

            const migrated = await migrateActorSource(source);
            sources.splice(sources.indexOf(source), 1, migrated);
        }

        return super.createDocuments(sources, context);
    }

    static override updateDocuments<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        updates?: Record<string, unknown>[],
        context?: DocumentUpdateContext<TDocument["parent"]>,
    ): Promise<TDocument[]>;
    static override async updateDocuments(
        updates: Record<string, unknown>[] = [],
        context: DocumentModificationContext<TokenDocumentPF2e | null> = {},
    ): Promise<Actor<TokenDocument<Scene | null> | null>[]> {
        // Process rule element hooks for each actor update
        for (const changed of updates) {
            await processPreUpdateActorHooks(changed, { pack: context.pack ?? null });
        }

        return super.updateDocuments(updates, context);
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this.constructed ??= false;
        this.signature ??= UUIDv5(this.uuid, "e9fa1461-0edc-4791-826e-08633f1c6ef7"); // magic number as namespace
        this._itemTypes = null;
        this.rules = [];
        this.initiative = null;
        this.armorClass = null;
        this.conditions = new ActorConditions();
        this.auras = new Map();

        const preparationWarnings: Set<string> = new Set();
        this.synthetics = {
            criticalSpecalizations: { standard: [], alternate: [] },
            damageDice: { damage: [] },
            degreeOfSuccessAdjustments: {},
            dexterityModifierCaps: [],
            modifierAdjustments: { all: [], damage: [] },
            modifiers: { all: [], damage: [] },
            movementTypes: {},
            multipleAttackPenalties: {},
            ephemeralEffects: {},
            rollNotes: {},
            rollSubstitutions: {},
            rollTwice: {},
            senses: [],
            statistics: new Map(),
            strikeAdjustments: [],
            strikes: new Map(),
            striking: {},
            tokenMarks: new Map(),
            toggles: [],
            tokenEffectIcons: [],
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

        super._initialize(options);

        if (game._documentsReady) {
            this.synthetics.preparationWarnings.flush();
        }
    }

    /** Set module art if available */
    protected override _initializeSource(
        source: Record<string, unknown>,
        options?: DocumentConstructionContext<TParent>,
    ): this["_source"] {
        const initialized = super._initializeSource(source, options);

        if (options?.pack && initialized._id) {
            const uuid: CompendiumUUID = `Compendium.${options.pack}.${initialized._id}`;
            const art = game.pf2e.system.moduleArt.map.get(uuid) ?? {};
            return mergeObject(initialized, art);
        }

        return initialized;
    }

    /** Prepare token data derived from this actor, refresh Effects Panel */
    override prepareData(): void {
        super.prepareData();

        // Split spellcasting entry into those that extend a magic tradition and those that don't.
        // Those that don't may be extending special statistics and need to run afterwards
        // NOTE: Later on special statistics should have support for phases (with class/spell dc defaulting to last)
        const spellcasting = this.itemTypes.spellcastingEntry;
        const traditionBased = spellcasting.filter((s) => setHasElement(MAGIC_TRADITIONS, s.system.proficiency.slug));
        const nonTraditionBased = spellcasting.filter((s) => !traditionBased.includes(s));
        for (const entry of traditionBased) {
            entry.prepareStatistic();
        }

        // Call post-derived-preparation `RuleElement` hooks
        for (const rule of this.rules) {
            rule.afterPrepareData?.();
        }

        // Run the spellcasting entries that need to run after special statistic
        for (const entry of nonTraditionBased) {
            entry.prepareStatistic();
        }

        // IWR rule elements were only just processed: set the actor to not off-guardable if immune to the condition
        if (this.attributes.flanking.offGuardable && this.isImmuneTo("off-guard")) {
            this.attributes.flanking.offGuardable = false;
        }

        this.preparePrototypeToken();
        if (this.constructed && canvas.ready) {
            // Work around `t.actor` potentially being a lazy getter for a synthetic actor (viz. this one)
            const thisTokenIsControlled = canvas.tokens.controlled.some(
                (t) => t.document === this.parent || (t.document.actorLink && t.actor === this),
            );
            if (game.user.character === this || thisTokenIsControlled) {
                game.pf2e.effectPanel.refresh();
            }
        }
    }

    /** Prepare baseline ephemeral data applicable to all actor types */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.autoChanges = {};
        this.system.attributes.flanking = { canFlank: false, canGangUp: [], flankable: false, offGuardable: false };

        const { attributes, details } = this.system;
        attributes.hp &&= mergeObject(attributes.hp, { negativeHealing: false, unrecoverable: 0 });
        attributes.immunities = attributes.immunities?.map((i) => new Immunity(i)) ?? [];
        attributes.weaknesses = attributes.weaknesses?.map((w) => new Weakness(w)) ?? [];
        attributes.resistances = attributes.resistances?.map((r) => new Resistance(r)) ?? [];
        details.level.value = Math.floor(details.level.value) || 0;

        const traits: ActorTraitsData<string> | undefined = this.system.traits;
        if (traits?.size) traits.size = new ActorSizePF2e(traits.size);

        // Setup the basic structure of pf2e flags with roll options
        this.flags.pf2e = mergeObject(this.flags.pf2e ?? {}, {
            rollOptions: {
                all: {
                    [`self:type:${this.type}`]: true,
                    [`self:signature:${this.signature}`]: true,
                    ...createEncounterRollOptions(this),
                },
            },
            trackedItems: {},
        });
    }

    /** Prepare the physical-item collection on this actor, item-sibling data, and rule elements */
    override prepareEmbeddedDocuments(): void {
        // Perform full reset instead of upstream's double data preparation
        // See https://github.com/foundryvtt/foundryvtt/issues/7987
        for (const item of this.items) {
            item.reset();
        }

        const physicalItems = this.items.filter((i): i is PhysicalItemPF2e<this> => i.isOfType("physical"));
        this.inventory = new ActorInventory(this, physicalItems);

        this.spellcasting = ((): ActorSpellcasting<this> => {
            const rituals = this.itemTypes.spell.filter((s) => s.isRitual).sort((a, b) => a.sort - b.sort);
            const spellcastingEntries = [
                this.itemTypes.spellcastingEntry,
                rituals.length > 0 ? new RitualSpellcasting(this, rituals) : [],
            ].flat();

            return new ActorSpellcasting(this, spellcastingEntries);
        })();

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
        // Ensure "temporary" items have their rule elements go last when priority is equal
        return R.sortBy(this.items.contents, (i) => i instanceof AbstractEffectPF2e)
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
                const ruleName = game.i18n.localize(`PF2E.RuleElement.${rule.key}`);
                console.error(`PF2e | Failed to execute onBeforePrepareData on rule element ${ruleName}.`, error);
            }
        }

        for (const item of this.items) {
            item.onPrepareSynthetics?.();
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
            { pf2e: { linkToActorSize: SIZE_LINKABLE_ACTOR_TYPES.has(this.type) } },
            this.prototypeToken.flags,
        );
        TokenDocumentPF2e.assignDefaultImage(this.prototypeToken);
        TokenDocumentPF2e.prepareSize(this.prototypeToken);
    }

    /* -------------------------------------------- */
    /*  Rolls                                       */
    /* -------------------------------------------- */

    protected getRollContext<
        TStatistic extends StatisticCheck | StrikeData | null,
        TItem extends ItemPF2e<ActorPF2e> | null,
    >(params: RollContextParams<TStatistic, TItem>): Promise<RollContext<this, TStatistic, TItem>>;
    protected async getRollContext(params: RollContextParams): Promise<RollContext<this>> {
        const [selfToken, targetToken] =
            canvas.ready && !params.viewOnly
                ? [
                      canvas.tokens.controlled.find((t) => t.actor === this) ?? this.getActiveTokens().shift() ?? null,
                      params.target?.token ?? params.target?.actor?.getActiveTokens().shift() ?? null,
                  ]
                : [null, null];

        const isAttackAction = ["attack", "attack-roll", "attack-damage"].some((d) => params.domains.includes(d));
        const isMelee = !!(params.melee || (params.item?.isOfType("weapon", "melee") && params.item.isMelee));
        const reach =
            isMelee && params.item?.isOfType("action", "weapon", "melee")
                ? this.getReach({ action: "attack", weapon: params.item })
                : this.getReach({ action: "attack" });
        const isFlankingAttack = !!(
            isAttackAction &&
            isMelee &&
            typeof reach === "number" &&
            targetToken?.actor &&
            selfToken?.isFlanking(targetToken, { reach })
        );

        // Get ephemeral effects from the target that affect this actor while attacking
        const originEphemeralEffects = await extractEphemeralEffects({
            affects: "origin",
            origin: this,
            target: params.target?.actor ?? targetToken?.actor ?? null,
            item: params.item ?? null,
            domains: params.domains,
            options: [...params.options, ...(params.item?.getRollOptions("item") ?? [])],
        });

        const tokenMarkOption = ((): string | null => {
            const tokenMark = targetToken ? this.synthetics.tokenMarks.get(targetToken.document.uuid) : null;
            return tokenMark ? `target:mark:${tokenMark}` : null;
        })();

        const selfActor =
            params.viewOnly || !targetToken?.actor
                ? this
                : this.getContextualClone(
                      R.compact(
                          [
                              Array.from(params.options),
                              targetToken.actor.getSelfRollOptions("target"),
                              tokenMarkOption,
                              isFlankingAttack ? "self:flanking" : null,
                          ].flat(),
                      ),
                      originEphemeralEffects,
                  );

        const isStrike = params.statistic instanceof StatisticModifier;
        const strikeActions: StrikeData[] = isStrike
            ? selfActor.system.actions?.flatMap((a) => [a, a.altUsages ?? []].flat()) ?? []
            : [];

        const statistic = params.viewOnly
            ? params.statistic
            : isStrike
            ? strikeActions.find((action): boolean => {
                  // Find the matching weapon or melee item
                  if (params.item?.id !== action.item.id || params?.item.name !== action.item.name) return false;
                  if (params.item.isOfType("melee") && action.item.isOfType("melee")) return true;

                  // Discriminate between melee/thrown usages by checking that both are either melee or ranged
                  return (
                      params.item.isOfType("weapon") &&
                      action.item.isOfType("weapon") &&
                      params.item.isMelee === action.item.isMelee
                  );
              }) ?? params.statistic
            : params.statistic;

        const selfItem = ((): ItemPF2e<ActorPF2e> | null => {
            // 1. Simplest case: no context clone, so used the item passed to this method
            if (selfActor === this) return params.item ?? null;

            // 2. Get the item from the statistic if it's stored therein
            if (
                statistic &&
                "item" in statistic &&
                statistic.item instanceof ItemPF2e &&
                statistic.item.isOfType("action", "melee", "spell", "weapon")
            ) {
                return statistic.item;
            }

            // 3. Get the item directly from the context clone
            const itemClone = selfActor.items.get(params.item?.id ?? "");
            if (itemClone?.isOfType("melee", "weapon")) return itemClone;

            // 4 Give up :(
            return params.item ?? null;
        })();

        const itemOptions = selfItem?.getRollOptions("item") ?? [];

        const traitSlugs: ActionTrait[] = [
            isAttackAction ? ("attack" as const) : [],
            // CRB p. 544: "Due to the complexity involved in preparing bombs, Strikes to throw alchemical bombs gain
            // the manipulate trait."
            isStrike && selfItem?.isOfType("weapon") && selfItem.baseType === "alchemical-bomb"
                ? ("manipulate" as const)
                : [],
        ].flat();

        if (selfItem?.isOfType("weapon", "melee")) {
            for (const adjustment of this.synthetics.strikeAdjustments) {
                adjustment.adjustTraits?.(selfItem, traitSlugs);
            }
        }

        const traits = traitSlugs.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits));
        // Calculate distance and range increment, set as a roll option
        const distance = selfToken && targetToken ? selfToken.distanceTo(targetToken) : null;
        const [originDistance, targetDistance] =
            typeof distance === "number"
                ? [`origin:distance:${distance}`, `target:distance:${distance}`]
                : [null, null];

        // Target roll options
        const getTargetRollOptions = (actor: Maybe<ActorPF2e>): string[] => {
            const targetOptions = actor?.getSelfRollOptions("target") ?? [];
            if (targetToken) {
                targetOptions.push("target"); // An indicator that there is a target of any kind
                if (tokenMarkOption) targetOptions.push(tokenMarkOption);
            }
            return targetOptions.sort();
        };
        const targetRollOptions = getTargetRollOptions(targetToken?.actor);

        // Get ephemeral effects from this actor that affect the target while being attacked
        const targetEphemeralEffects = await extractEphemeralEffects({
            affects: "target",
            origin: selfActor,
            target: targetToken?.actor ?? null,
            item: selfItem,
            domains: params.domains,
            options: [...params.options, ...itemOptions, ...targetRollOptions],
        });

        // Add an epehemeral effect from flanking
        if (isFlankingAttack && isOffGuardFromFlanking(targetToken.actor, selfActor)) {
            const name = game.i18n.localize("PF2E.Item.Condition.Flanked");
            const condition = game.pf2e.ConditionManager.getCondition("off-guard", { name });
            targetEphemeralEffects.push(condition.toObject());
        }

        // Clone the actor to recalculate its AC with contextual roll options
        const targetActor = params.viewOnly
            ? null
            : (params.target?.actor ?? targetToken?.actor)?.getContextualClone(
                  [
                      ...selfActor.getSelfRollOptions("origin"),
                      ...params.options,
                      ...itemOptions,
                      ...(originDistance ? [originDistance] : []),
                  ],
                  targetEphemeralEffects,
              ) ?? null;

        const rollOptions = new Set(
            R.compact([
                ...params.options,
                ...selfActor.getRollOptions(params.domains),
                ...(targetActor ? getTargetRollOptions(targetActor) : targetRollOptions),
                ...itemOptions,
                // Backward compatibility for predication looking for an "attack" trait by its lonesome
                isAttackAction ? "attack" : null,
            ]).sort(),
        );

        if (targetDistance) rollOptions.add(targetDistance);
        const rangeIncrement = selfItem ? getRangeIncrement(selfItem, distance) : null;
        if (rangeIncrement) rollOptions.add(`target:range-increment:${rangeIncrement}`);

        const self = {
            actor: selfActor,
            token: selfToken?.document ?? null,
            statistic,
            item: selfItem,
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

    /** Calculate attack roll targeting data, including the target's DC. */
    async getCheckContext<TStatistic extends StatisticCheck | StrikeData, TItem extends ItemPF2e<ActorPF2e> | null>(
        params: CheckContextParams<TStatistic, TItem>,
    ): Promise<CheckContext<this, TStatistic, TItem>> {
        const context = await this.getRollContext(params);
        const targetActor = context.target?.actor;
        const rangeIncrement = context.target?.rangeIncrement ?? null;

        const rangePenalty = calculateRangePenalty(this, rangeIncrement, params.domains, context.options);
        if (rangePenalty) context.self.modifiers.push(rangePenalty);

        const dcData = ((): CheckDC | null => {
            const { domains, defense } = params;
            const scope = domains.includes("attack") ? "attack" : "check";
            const statistic = targetActor?.getStatistic(defense)?.dc;
            return statistic ? { scope, statistic, slug: defense, value: statistic.value } : null;
        })();

        return { ...context, dc: dcData };
    }

    /** Acquire additional data for a damage roll. */
    getDamageRollContext<
        TStatistic extends StatisticCheck | StrikeData | null,
        TItem extends ItemPF2e<ActorPF2e> | null,
    >(params: DamageRollContextParams<TStatistic, TItem>): Promise<RollContext<this, TStatistic, TItem>>;
    async getDamageRollContext(params: DamageRollContextParams): Promise<RollContext<this>> {
        // In case the user rolled damage from their sheet, try to fish out the check context from chat
        params.checkContext ??= findMatchingCheckContext(this, params);

        if (params.outcome) params.options.add(`check:outcome:${sluggify(params.outcome)}`);

        const substitution = params.checkContext?.substitutions.find((s) => s.selected);
        if (substitution) params.options.add(`check:substitution:${substitution.slug}`);

        return this.getRollContext(params);
    }

    /** Toggle the provided roll option (swapping it from true to false or vice versa). */
    async toggleRollOption(domain: string, option: string, value?: boolean): Promise<boolean | null>;
    async toggleRollOption(
        domain: string,
        option: string,
        itemId?: string | null,
        value?: boolean,
        suboption?: string | null,
    ): Promise<boolean | null>;
    async toggleRollOption(
        domain: string,
        option: string,
        itemId: string | boolean | null = null,
        value?: boolean,
        suboption: string | null = null,
    ): Promise<boolean | null> {
        // Backward compatibility
        value = typeof itemId === "boolean" ? itemId : value ?? !this.rollOptions[domain]?.[option];

        if (typeof itemId === "string") {
            // An item ID is provided: find the rule on the item
            const item = this.items.get(itemId, { strict: true });
            const rule = item.rules.find(
                (r): r is RollOptionRuleElement =>
                    r instanceof RollOptionRuleElement && r.domain === domain && r.option === option,
            );
            return rule?.toggle(value, suboption) ?? null;
        } else {
            // Less precise: no item ID is provided, so find the rule on the actor
            const rule = this.rules.find(
                (r): r is RollOptionRuleElement =>
                    r instanceof RollOptionRuleElement && r.domain === domain && r.option === option,
            );
            return rule?.toggle(value, suboption) ?? null;
        }
    }

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     *
     * If the attribute bar is for hp and the change is in delta form, defer to the applyDamage method. Otherwise, do
     * nothing special.
     * @param attribute The attribute path
     * @param value     The target attribute value
     * @param isDelta   Whether the number represents a relative change (true) or an absolute change (false)
     * @param isBar     Whether the new value is part of an attribute bar, or just a direct value
     */
    override async modifyTokenAttribute(
        attribute: string,
        value: number,
        isDelta = false,
        isBar?: boolean,
    ): Promise<this> {
        const token = this.getActiveTokens(true, true).shift();
        const { hitPoints } = this;
        const isDamage = !!(
            attribute === "attributes.hp" &&
            hitPoints &&
            (isDelta || (value === 0 && token?.combatant))
        );
        if (isDamage && token) {
            const damage = isDelta ? -1 * value : hitPoints.value - value;
            return this.applyDamage({ damage, token });
        }
        return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     * @param finalDamage The amount of damage inflicted
     * @param token The applicable token for this actor
     * @param shieldBlockRequest Whether the user has toggled the Shield Block button
     */
    async applyDamage({
        damage,
        token,
        item,
        rollOptions = new Set(),
        skipIWR = false,
        shieldBlockRequest = false,
        breakdown = [],
        notes = [],
    }: ApplyDamageParams): Promise<this> {
        const { hitPoints } = this;
        if (!hitPoints) return this;

        // Round damage and healing (negative values) toward zero
        const result: IWRApplicationData =
            typeof damage === "number"
                ? { finalDamage: Math.trunc(damage), applications: [], persistent: [] }
                : skipIWR
                ? { finalDamage: damage.total, applications: [], persistent: [] }
                : applyIWR(this, damage, rollOptions);

        const { finalDamage } = result;

        // Calculate damage to hit points and shield
        const localize = localizer("PF2E.Actor.ApplyDamage");
        const actorShield = this.isOfType("character", "npc") ? this.attributes.shield : null;
        const shieldBlock =
            actorShield && shieldBlockRequest
                ? ((): boolean => {
                      if (actorShield.broken) {
                          ui.notifications.warn(
                              game.i18n.format("PF2E.Actions.RaiseAShield.ShieldIsBroken", {
                                  actor: token.name,
                                  shield: actorShield.name,
                              }),
                          );
                          return false;
                      } else if (actorShield.destroyed) {
                          ui.notifications.warn(
                              game.i18n.format("PF2E.Actions.RaiseAShield.ShieldIsDestroyed", {
                                  actor: token.name,
                                  shield: actorShield.name,
                              }),
                          );
                          return false;
                      } else if (!actorShield.raised) {
                          ui.notifications.warn(localize("ShieldNotRaised", { actor: token.name }));
                          return false;
                      } else {
                          return true;
                      }
                  })()
                : false;

        const shieldHardness = shieldBlock ? actorShield?.hardness ?? 0 : 0;
        const damageAbsorbedByShield = finalDamage > 0 ? Math.min(shieldHardness, finalDamage) : 0;
        const { heldShield } = this;
        // The blocking shield may not be the held shield, such as in when the Shield spell is in play
        const blockingShield = heldShield?.id === actorShield?.itemId ? heldShield : null;
        const currentShieldHP = blockingShield ? blockingShield._source.system.hp.value : actorShield?.hp.value ?? 0;
        const shieldDamage = shieldBlock
            ? Math.min(currentShieldHP, Math.abs(finalDamage) - damageAbsorbedByShield)
            : 0;

        // Reduce damage by actor hardness
        const baseActorHardness = this.hardness;
        const effectiveActorHardness = ((): number => {
            // "[Adamantine weapons] treat any object they hit as if it had half as much Hardness as usual, unless the
            // object's Hardness is greater than that of the adamantine weapon."
            const damageHasAdamantine = typeof damage === "number" ? false : damage.materials.has("adamantine");
            const materialGrade =
                item?.isOfType("weapon") && item.system.material.type === "adamantine"
                    ? item.system.material.grade ?? "standard"
                    : "standard";
            // Hardness values for thin adamantine items (inclusive of weapons):
            const itemHardness = {
                low: 0, // low-grade adamantine doesn't exist
                standard: 10,
                high: 13,
            }[materialGrade];
            return damageHasAdamantine && itemHardness >= baseActorHardness
                ? Math.floor(baseActorHardness / 2)
                : baseActorHardness;
        })();

        // Include actor-hardness absorption in list of damage modifications
        const damageAbsorbedByActor =
            finalDamage > 0 ? Math.min(finalDamage - damageAbsorbedByShield, effectiveActorHardness) : 0;
        if (damageAbsorbedByActor > 0) {
            const typeLabel =
                effectiveActorHardness === baseActorHardness
                    ? "PF2E.Damage.Hardness.Full"
                    : "PF2E.Damage.Hardness.Half";
            result.applications.push({
                category: "reduction",
                type: game.i18n.localize(typeLabel),
                adjustment: -1 * damageAbsorbedByActor,
            });
        }

        const hpUpdate = this.calculateHealthDelta({
            hp: hitPoints,
            sp: this.isOfType("character") ? this.attributes.hp.sp : null,
            delta: finalDamage - damageAbsorbedByShield - damageAbsorbedByActor,
        });
        const hpDamage = hpUpdate.totalApplied;

        // Save the pre-update state to calculate undo values
        const preUpdateSource = this.toObject();

        // Make updates
        if (blockingShield && shieldDamage > 0) {
            await blockingShield.update(
                { "system.hp.value": Math.max(blockingShield._source.system.hp.value - shieldDamage, 0) },
                { render: hpDamage === 0 },
            );
        }

        const instantDeath = ((): string | null => {
            if (hpUpdate.totalApplied === 0 || hpUpdate.totalApplied < hitPoints.value) {
                return null;
            }
            const staminaMax = this.isOfType("character") ? this.attributes.hp.sp?.max ?? 0 : 0;
            return rollOptions.has("item:trait:death") &&
                !this.attributes.immunities.some((i) => i.type === "death-effects")
                ? localize("InstantDeath.DeathEffect")
                : this.isOfType("npc") && this.modeOfBeing === "undead"
                ? localize("InstantDeath.Destroyed")
                : hpUpdate.totalApplied >= (hitPoints.max + staminaMax) * 2
                ? localize("InstantDeath.MassiveDamage")
                : rollOptions.has("item:type:spell") && rollOptions.has("item:slug:disintegrate")
                ? localize("InstantDeath.FinePowder")
                : null;
        })();

        if (hpDamage !== 0) {
            const updated = await this.update(hpUpdate.updates, { damageTaken: hpDamage });
            const setting = game.settings.get("pf2e", "automation.actorsDeadAtZero");
            const deadAtZero =
                (this.isOfType("npc") && ["npcsOnly", "both"].includes(setting)) ||
                (this.isOfType("character") && setting === "both" && !!instantDeath);

            if (
                updated.isDead &&
                deadAtZero &&
                ((hpDamage >= 0 && !token.combatant?.isDefeated) || (hpDamage < 0 && !!token.combatant?.isDefeated))
            ) {
                token.combatant?.toggleDefeated();
            }
        }

        // Send chat message
        const hpStatement = ((): string => {
            // This would be a nested ternary, except prettier thoroughly mangles it
            if (finalDamage - damageAbsorbedByActor === 0) {
                return localize("TakesNoDamage");
            }
            if (finalDamage > 0) {
                return damageAbsorbedByShield > 0
                    ? hpDamage > 0
                        ? localize("DamagedForNShield")
                        : localize("ShieldAbsorbsAll")
                    : localize("DamagedForN");
            }
            return hpDamage < 0 ? localize("HealedForN") : localize("AtFullHealth");
        })();

        const updatedShield = this.isOfType("character", "npc") ? this.attributes.shield : null;
        const shieldStatement =
            updatedShield && shieldDamage > 0
                ? updatedShield.broken
                    ? localize("ShieldDamagedForNBroken")
                    : updatedShield.destroyed
                    ? localize("ShieldDamagedForNDestroyed")
                    : localize("ShieldDamagedForN")
                : null;

        const statements = ((): string => {
            const concatenated = R.compact([hpStatement, shieldStatement, instantDeath])
                .map((s) =>
                    game.i18n.format(s, {
                        actor: token.name.replace(/[<>]/g, ""),
                        hpDamage: Math.abs(hpDamage),
                        absorbedDamage: damageAbsorbedByShield,
                        shieldDamage,
                    }),
                )
                .join(" ");

            // In case "tokenSetsNameVisibility" is enabled, replace <actor> XML nodes with span elements indicating
            // where the damage recipient's name is in the message so that it may be obscured to players.
            const tempElem = document.createElement("div");
            tempElem.innerHTML = concatenated;
            TextEditorPF2e.convertXMLNode(tempElem, "actor", { whose: null, classes: ["target-name"] });

            return tempElem.innerHTML;
        })();

        const deparenthesize = (formula: string) => formula.replace(/^\(([^)]+)\)$/, "$1");

        // Apply persistent damage as conditions
        const persistentDamage = result.persistent.map((instance) => {
            const condition = game.pf2e.ConditionManager.getCondition("persistent-damage").toObject();
            condition.system.persistent = {
                // Remove enclosing parentheses if present since it's no longer part of the original expression
                formula: deparenthesize(instance.head.expression),
                damageType: instance.type,
                dc: 15,
            };
            return condition;
        });

        const persistentCreated = (
            persistentDamage.length > 0 ? await this.createEmbeddedDocuments("Item", persistentDamage) : []
        ) as ConditionPF2e<this>[];

        const canUndoDamage = !!(hpDamage || shieldDamage || persistentCreated.length);
        const content = await renderTemplate("systems/pf2e/templates/chat/damage/damage-taken.hbs", {
            breakdown,
            notes,
            statements,
            persistent: persistentCreated.map((p) => p.system.persistent!.damage.formula),
            iwr: {
                applications: result.applications,
                visibility: this.hasPlayerOwner ? "all" : "gm",
            },
            canUndoDamage,
        });
        const flavor = await (async (): Promise<string | undefined> => {
            if (breakdown.length || notes.length) {
                return renderTemplate("systems/pf2e/templates/chat/damage/damage-taken-flavor.hbs", {
                    breakdown,
                    notes,
                });
            }
            return;
        })();

        const appliedDamage = canUndoDamage
            ? {
                  uuid: this.uuid,
                  isHealing: hpDamage < 0,
                  shield: shieldDamage !== 0 ? { id: actorShield?.itemId ?? "", damage: shieldDamage } : null,
                  persistent: persistentCreated.map((c) => c.id),
                  updates: Object.entries(hpUpdate.updates)
                      .map(([path, newValue]) => {
                          const preUpdateValue = getProperty(preUpdateSource, path);
                          if (typeof preUpdateValue === "number") {
                              const difference = preUpdateValue - newValue;
                              if (difference === 0) {
                                  // Ignore the update if there is no difference
                                  return [];
                              }
                              return {
                                  path,
                                  value: difference,
                              };
                          }
                          return [];
                      })
                      .flat(),
              }
            : null;

        await ChatMessagePF2e.create({
            speaker: ChatMessagePF2e.getSpeaker({ token }),
            flags: {
                pf2e: {
                    appliedDamage,
                },
            },
            flavor,
            content,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            whisper:
                game.settings.get("pf2e", "metagame_secretDamage") && !token.actor?.hasPlayerOwner
                    ? ChatMessagePF2e.getWhisperRecipients("GM").map((u) => u.id)
                    : [],
        });

        return this;
    }

    /** Revert applied actor damage based on the AppliedDamageFlag stored in a damage chat message */
    async undoDamage(appliedDamage: AppliedDamageFlag): Promise<void> {
        const { updates, shield, persistent } = appliedDamage;

        const actorUpdates: Record<string, number | Record<string, number | string>[]> = {};
        for (const update of updates) {
            const currentValue = getProperty(this, update.path);
            if (typeof currentValue === "number") {
                actorUpdates[update.path] = currentValue + update.value;
            }
        }

        if (shield) {
            const item = this.inventory.get<ArmorPF2e<this>>(shield.id);
            if (item) {
                actorUpdates.items = [
                    {
                        _id: shield.id,
                        "system.hp.value": item.hitPoints.value + shield.damage,
                    },
                ];
            }
        }

        const updateCount = Object.keys(actorUpdates).length;
        if (persistent.length) {
            await this.deleteEmbeddedDocuments("Item", persistent, { render: updateCount === 0 });
        }
        if (updateCount) {
            const { hitPoints } = this;
            const damageTaken =
                hitPoints && typeof actorUpdates["system.attributes.hp.value"] === "number"
                    ? hitPoints.value - actorUpdates["system.attributes.hp.value"]
                    : 0;
            this.update(actorUpdates, { damageTaken, damageUndo: true });
        }
    }

    isLootableBy(user: UserPF2e): boolean {
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
        item: ItemPF2e<ActorPF2e>,
        quantity: number,
        containerId?: string,
        newStack = false,
    ): Promise<PhysicalItemPF2e<ActorPF2e> | null> {
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
        container?: ContainerPF2e<this>,
        newStack?: boolean,
    ): Promise<PhysicalItemPF2e<this> | null> {
        // Stack with an existing item if possible
        const stackItem = this.inventory.findStackableItem(itemSource);
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

    /** Move an item into the inventory into or out of a container */
    async stowOrUnstow(item: PhysicalItemPF2e<this>, container?: ContainerPF2e<this>): Promise<void> {
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
        sp?: Maybe<{ max: number; value: number }>;
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
            updates["system.attributes.hp.sp.value"] = Math.max(sp.value - applied, 0);

            return applied;
        })();

        const appliedToHP = ((): number => {
            const remaining = delta - appliedToTemp - appliedToSP;
            updates["system.attributes.hp.value"] = Math.clamped(hp.value - remaining, 0, hp.max);
            return remaining;
        })();
        const totalApplied = appliedToTemp + appliedToSP + appliedToHP;

        return { updates, totalApplied };
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

    /** This allows @actor.level and such to work for macros and inline rolls */
    override getRollData(): NonNullable<EnrichmentOptionsPF2e["rollData"]> {
        const rollData = { actor: this };
        for (const prop of ["abilities", "attributes", "details", "skills", "saves"] as const) {
            Object.defineProperty(rollData, prop, {
                get: () => {
                    foundry.utils.logCompatibilityWarning(`@${prop} is deprecated`, {
                        since: "5.0.1",
                        until: "6",
                    });
                    return objectHasKey(this.system, prop) ? deepClone(this.system[prop]) : null;
                },
            });
        }

        return rollData;
    }

    /* -------------------------------------------- */
    /* Conditions                                   */
    /* -------------------------------------------- */

    /** Gets an active condition on the actor or a list of conditions sorted by descending value. */
    getCondition(slugOrKey: ConditionKey, { all }: { all: true }): ConditionPF2e<this>[];
    getCondition(slugOrKey: ConditionKey, { all }: { all?: false }): ConditionPF2e<this> | null;
    getCondition(slugOrKey: ConditionKey): ConditionPF2e<this> | null;
    getCondition(
        slugOrKey: ConditionKey,
        { all }: { all?: boolean },
    ): ConditionPF2e<this>[] | ConditionPF2e<this> | null;
    getCondition(slugOrKey: ConditionKey, { all = false } = {}): ConditionPF2e<this>[] | ConditionPF2e<this> | null {
        const conditions = this.conditions.filter((c) => c.key === slugOrKey || c.slug === slugOrKey);

        if (all) {
            return conditions.sort((conditionA, conditionB) => {
                const [valueA, valueB] = [conditionA.value ?? 0, conditionB.value ?? 0] as const;
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            });
        } else {
            return conditions.find((c) => c.active) ?? null;
        }
    }

    /**
     * Does this actor have any of the provided condition?
     * @param slugs Slug(s) of the queried condition(s)
     */
    hasCondition(...slugs: ConditionSlug[]): boolean {
        return slugs.some((s) => this.conditions.bySlug(s, { active: true }).length > 0);
    }

    /** Decrease the value of condition or remove it entirely */
    async decreaseCondition(
        conditionSlug: ConditionKey | ConditionPF2e<this>,
        { forceRemove }: { forceRemove: boolean } = { forceRemove: false },
    ): Promise<void> {
        // Find a valid matching condition if a slug was passed
        const condition = typeof conditionSlug === "string" ? this.getCondition(conditionSlug) : conditionSlug;
        if (!condition) return;

        // If this is persistent damage, remove all matching types, heal from all at once
        if (condition.slug === "persistent-damage") {
            const matching = this.conditions.stored.filter((c) => c.key === condition.key).map((c) => c.id);
            await this.deleteEmbeddedDocuments("Item", matching);
            return;
        }

        const currentValue = condition._source.system.value.value;
        const newValue = typeof currentValue === "number" ? Math.max(currentValue - 1, 0) : null;
        if (newValue !== null && !forceRemove) {
            await game.pf2e.ConditionManager.updateConditionValue(condition.id, this, newValue);
        } else {
            await this.deleteEmbeddedDocuments("Item", [condition.id]);
        }
    }

    /** Increase a valued condition, or create a new one if not present */
    async increaseCondition(
        conditionSlug: ConditionSlug | ConditionPF2e<this>,
        { max = Number.MAX_SAFE_INTEGER, value }: { max?: number; value?: number | null } = {},
    ): Promise<ConditionPF2e<this> | null> {
        // Persistent damage goes through a dialog instead
        if (conditionSlug === "persistent-damage") {
            await new PersistentDialog(this).render(true);
            return null;
        }

        // Resolves the condition. If the argument is a condition, return it. Otherwise find an existing one.
        // If value is defined, this is a condition being dragged, so prioritized unlocked
        const existing = (() => {
            if (typeof conditionSlug !== "string") return conditionSlug;

            const conditions = this.itemTypes.condition;
            return value
                ? conditions.find((c) => c.slug === conditionSlug && !c.isLocked)
                : conditions.find((c) => c.slug === conditionSlug && c.active);
        })();

        if (existing) {
            const newValue = (() => {
                const currentValue = existing._source.system.value.value;
                if (currentValue === null) return null;
                const addend = value ?? 1;
                return Math.clamped(currentValue + addend, 1, max);
            })();
            if (!newValue) return null;
            await game.pf2e.ConditionManager.updateConditionValue(existing.id, this, newValue);
            return existing;
        } else if (typeof conditionSlug === "string") {
            const conditionSource = game.pf2e.ConditionManager.getCondition(conditionSlug).toObject();
            const conditionValue =
                typeof conditionSource.system.value.value === "number" && max
                    ? Math.clamped(conditionSource.system.value.value, value ?? 1, max)
                    : null;
            conditionSource.system.value.value = conditionValue;
            const items = (await this.createEmbeddedDocuments("Item", [conditionSource])) as ConditionPF2e<this>[];

            return items.shift() ?? null;
        }

        return null;
    }

    /** Toggle a condition as present or absent. If a valued condition is toggled on, it will be set to a value of 1. */
    async toggleCondition(conditionSlug: ConditionSlug): Promise<void> {
        if (!setHasElement(CONDITION_SLUGS, conditionSlug)) {
            throw ErrorPF2e(`Unrecognized condition: ${conditionSlug}`);
        }

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
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _applyDefaultTokenSettings(
        data: this["_source"],
        options?: { fromCompendium?: boolean },
    ): DeepPartial<this["_source"]> {
        const diff = super._applyDefaultTokenSettings(data, options);
        if (this._source.prototypeToken.texture.src === CONST.DEFAULT_TOKEN) {
            this._source.prototypeToken.texture.src = ActorPF2e.getDefaultArtwork(data).texture.src;
        }

        return diff;
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: ActorUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        // Always announce HP changes for player-owned actors as floaty text (via `damageTaken` option)
        const changedHP = changed.system?.attributes?.hp;
        const currentHP = this.hitPoints;
        if (!options.damageTaken && this.hasPlayerOwner && typeof changedHP?.value === "number" && currentHP) {
            const damageTaken = -1 * (changedHP.value - currentHP.value);
            const levelChanged = !!changed.system?.details && "level" in changed.system.details;
            if (damageTaken && !levelChanged) options.damageTaken = damageTaken;
        }

        return super._preUpdate(changed, options, user);
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: ActorUpdateContext<TParent>,
        userId: string,
    ): void {
        super._onUpdate(changed, options, userId);
        const hideFromUser =
            !this.hasPlayerOwner && !game.user.isGM && game.settings.get("pf2e", "metagame_secretDamage");
        if (options.damageTaken && !hideFromUser) {
            const tokens = this.getActiveTokens();
            for (const token of tokens) {
                token.showFloatyText(-1 * options.damageTaken);
            }
        }

        // If alliance has changed, reprepare token data to update the color of bounding boxes
        if (canvas.ready && changed.system?.details && "alliance" in changed.system.details) {
            for (const token of this.getActiveTokens(true, true)) {
                token.reset();
            }
        }

        // Remove the death overlay if present upon hit points being increased
        const currentHP = this.hitPoints?.value ?? 0;
        const hpChange = Number(changed.system?.attributes?.hp?.value) || 0;
        if (currentHP > 0 && hpChange > 0 && this.isDead) {
            const { combatant } = this;
            if (combatant) {
                combatant.toggleDefeated({ to: false });
            } else {
                for (const tokenDoc of this.getActiveTokens(false, true)) {
                    tokenDoc.update({ overlayEffect: "" });
                }
            }
        }
    }

    /**
     * Work around upstream issue in which `TokenDocument#_onUpdateBaseActor` is only called for tokens in the viewed
     * scene.
     */
    protected override _updateDependentTokens(
        update?: Record<string, unknown>,
        options?: DocumentModificationContext<TParent>,
    ): void {
        if (game.release.build > 305) return super._updateDependentTokens(update, options);
        const tokens = game.scenes.map((s) => s.tokens.filter((t) => t.actorId === this.id)).flat();
        for (const token of tokens) {
            token._onUpdateBaseActor(update, options);
        }
    }

    /** Unregister all effects possessed by this actor */
    protected override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        for (const effect of this.itemTypes.effect) {
            game.pf2e.effectTracker.unregister(effect);
        }
        super._onDelete(options, userId);
    }

    protected override _onEmbeddedDocumentChange(): void {
        super._onEmbeddedDocumentChange();

        // Send any accrued warnings to the console
        this.synthetics.preparationWarnings.flush();
    }
}

interface ActorPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends Actor<TParent> {
    flags: ActorFlagsPF2e;
    readonly _source: ActorSourcePF2e;
    readonly effects: foundry.abstract.EmbeddedCollection<ActiveEffectPF2e<this>>;
    readonly items: foundry.abstract.EmbeddedCollection<ItemPF2e<this>>;
    system: ActorSystemData;

    prototypeToken: PrototypeTokenPF2e<this>;

    get sheet(): ActorSheetPF2e<ActorPF2e>;

    update(data: Record<string, unknown>, options?: ActorUpdateContext<TParent>): Promise<this>;

    getActiveTokens(linked: boolean | undefined, document: true): TokenDocumentPF2e<ScenePF2e>[];
    getActiveTokens(linked?: boolean | undefined, document?: false): TokenPF2e<TokenDocumentPF2e<ScenePF2e>>[];
    getActiveTokens(
        linked?: boolean,
        document?: boolean,
    ): TokenDocumentPF2e<ScenePF2e>[] | TokenPF2e<TokenDocumentPF2e<ScenePF2e>>[];

    /** See implementation in class */
    createEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        data: PreCreate<foundry.documents.ActiveEffectSource>[],
        context?: DocumentModificationContext<this>,
    ): Promise<ActiveEffectPF2e<this>[]>;
    createEmbeddedDocuments(
        embeddedName: "Item",
        data: PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext<this>,
    ): Promise<ItemPF2e<this>[]>;
    createEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        data: PreCreate<foundry.documents.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext<this>,
    ): Promise<ActiveEffectPF2e<this>[] | ItemPF2e<this>[]>;

    /** See implementation in class */
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        updateData: EmbeddedDocumentUpdateData[],
        options?: DocumentUpdateContext<this>,
    ): Promise<ActiveEffectPF2e<this>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Item",
        updateData: EmbeddedDocumentUpdateData[],
        options?: DocumentUpdateContext<this>,
    ): Promise<ItemPF2e<this>[]>;
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        updateData: EmbeddedDocumentUpdateData[],
        options?: DocumentUpdateContext<this>,
    ): Promise<ActiveEffectPF2e<this>[] | ItemPF2e<this>[]>;

    /** Added as debounced method */
    checkAreaEffects(): void;
}

interface HitPointsSummary {
    value: number;
    max: number;
    temp: number;
    unrecoverable: number;
    negativeHealing: boolean;
}

interface ActorUpdateContext<TParent extends TokenDocumentPF2e | null> extends DocumentUpdateContext<TParent> {
    damageTaken?: number;
    damageUndo?: boolean;
}

/** A `Proxy` to to get Foundry to construct `ActorPF2e` subclasses */
const ActorProxyPF2e = new Proxy(ActorPF2e, {
    construct(
        _target,
        args: [source: PreCreate<ActorSourcePF2e>, context?: DocumentConstructionContext<ActorPF2e["parent"]>],
    ) {
        return new CONFIG.PF2E.Actor.documentClasses[args[0].type](...args);
    },
});

export { ActorPF2e, ActorProxyPF2e };
export type { ActorUpdateContext, HitPointsSummary };
