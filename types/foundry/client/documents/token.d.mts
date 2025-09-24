import { TokenAnimationOptions, TokenConstrainMovementPathOptions } from "@client/_module.mjs";
import TokenConfig from "@client/applications/sheets/token/token-config.mjs";
import { DocumentConstructionContext, ElevatedPoint, TokenDimensions, TokenPosition } from "@common/_types.mjs";
import {
    DatabaseCreateCallbackOptions,
    DatabaseCreateOperation,
    DatabaseDeleteCallbackOptions,
    DatabaseDeleteOperation,
    DatabaseOperation,
    DatabaseUpdateCallbackOptions,
    DatabaseUpdateOperation,
    DataModelConstructionContext,
} from "@common/abstract/_types.mjs";
import Document from "@common/abstract/document.mjs";
import { ImageFilePath } from "@common/constants.mjs";
import { SchemaField } from "@common/data/fields.mjs";
import { GridMeasurePathResult } from "@common/grid/_types.mjs";
import Collection from "@common/utils/collection.mjs";
import Token, { TokenResourceData } from "../canvas/placeables/token.mjs";
import {
    Actor,
    BaseToken,
    BaseUser,
    Combat,
    Combatant,
    RegionDocument,
    Scene,
    TokenCompleteMovementWaypoint,
    TokenDocumentUUID,
    TokenGetCompleteMovementPathWaypoint,
    TokenMeasuredMovementWaypoint,
    TokenMeasureMovementPathWaypoint,
    TokenMovementContinuationData,
    TokenMovementCostFunction,
    TokenMovementData,
    TokenMovementMethod,
    TokenMovementOperation,
    TokenMovementWaypoint,
    TokenRegionMovementSegment,
    TokenResumeMovementCallback,
    TokenSegmentizeMovementWaypoint,
    TrackedAttributesDescription,
    User,
} from "./_module.mjs";
import { CanvasDocument, CanvasDocumentStatic } from "./abstract/canvas-document.mjs";

interface CanvasBaseTokenStatic extends Omit<typeof BaseToken, "new">, CanvasDocumentStatic {}

declare const CanvasBaseToken: {
    new <TParent extends Scene | null>(...args: any): BaseToken<TParent> & CanvasDocument<TParent>;
} & CanvasBaseTokenStatic;

interface CanvasBaseToken<TParent extends Scene | null> extends InstanceType<typeof CanvasBaseToken<TParent>> {}

export default class TokenDocument<TParent extends Scene | null = Scene | null> extends CanvasBaseToken<TParent> {
    /**
     * The current movement data of this Token document.
     */
    get movement(): DeepReadonly<TokenMovementData>;

    /**
     * The movement continuation state of this Token document.
     * @internal
     */
    _movementContinuation: TokenMovementContinuationData;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * A singleton collection which holds a reference to the synthetic token actor by its base actor's ID.
     */
    actors: Collection<string, Actor>;

    /** The Regions this Token is currently in. */
    regions: Set<RegionDocument<NonNullable<TParent>>>;

    /**
     * A reference to the Actor this Token modifies.
     * If actorLink is true, then the document is the primary Actor document.
     * Otherwise, the Actor document is a synthetic (ephemeral) document constructed using the Token's ActorDelta.
     */
    get actor(): Actor<this | null> | null;

    /**
     * A reference to the base, World-level Actor this token represents.
     */
    get baseActor(): Actor<null> | null;

    /**
     * An indicator for whether the current User has full control over this Token document.
     */
    get isOwner(): boolean;

    /**
     * A convenient reference for whether this TokenDocument is linked to the Actor it represents, or is a synthetic copy
     */
    get isLinked(): boolean;

    /**
     * Does this TokenDocument have the SECRET disposition and is the current user lacking the necessary permissions
     * that would reveal this secret?
     */
    get isSecret(): boolean;

    /**
     * Return a reference to a Combatant that represents this Token, if one is present in the current encounter.
     */
    get combatant(): Combatant<Combat> | null;

    /**
     * An indicator for whether this Token is currently involved in the active combat encounter.
     */
    get inCombat(): boolean;

    /**
     * The movement history.
     */
    get movementHistory(): TokenMeasuredMovementWaypoint[];

    /**
     * Check if the document has a distinct subject texture (inferred or explicit).
     */
    get hasDistinctSubjectTexture(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    protected override _initializeSource(
        data: object,
        options?: DataModelConstructionContext<TParent>,
    ): this["_source"];

    protected override _initialize(options?: Record<string, unknown>): void;

    override prepareBaseData(): void;

    override prepareEmbeddedDocuments(): void;

    override prepareDerivedData(): void;

    /**
     * Infer the subject texture path to use for a token ring.
     */
    protected _inferRingSubjectTexture(): ImageFilePath;

    /**
     * Infer the movement action.
     * The default implementation returns `CONFIG.Token.movement.defaultAction`.
     */
    protected _inferMovementAction(): string;

    /**
     * Prepare detection modes which are available to the Token.
     * Ensure that every Token has the basic sight detection mode configured.
     */
    protected _prepareDetectionModes(): void;

    override clone(data?: Record<string, unknown>, context?: DocumentCloneContext): this;

    /**
     * Create a synthetic Actor using a provided Token instance
     * If the Token data is linked, return the true Actor document
     * If the Token data is not linked, create a synthetic Actor using the Token's actorData override
     */
    getActor(): Actor<this | null> | null;

    /**
     * A helper method to retrieve the underlying data behind one of the Token's attribute bars
     * @param barName The named bar to retrieve the attribute for
     * @param options.alternative An alternative attribute path to get instead of the default one
     * @returns The attribute displayed on the Token bar, if any
     */
    getBarAttribute(barName: string, options?: { alternative?: string }): TokenResourceData | null;

    /**
     * Test whether a Token has a specific status effect.
     * @param statusId The status effect ID as defined in CONFIG.statusEffects
     * @returns Does the Actor of the Token have this status effect?
     */
    hasStatusEffect(statusId: string): boolean;

    /**
     * Move the Token through the given waypoint(s).
     * @param waypoints The waypoint(s) to move the Token through
     * @param options Parameters of the update operation
     * @returns A Promise that resolves to true if the Token was moved, otherwise resolves to false
     */
    move(
        waypoints: Partial<TokenMovementWaypoint> | Partial<TokenMovementWaypoint>[],
        options?: Partial<
            Omit<DatabaseUpdateOperation<TParent>, "updates"> & {
                method: TokenMovementMethod;
                autoRotate: boolean;
                showRuler: boolean;
                constrainOptions: Omit<TokenConstrainMovementPathOptions, "preview" | "history">;
            }
        >,
    ): Promise<boolean>;

    /**
     * Undo all recorded movement or the recorded movement corresponding to given movement ID up to the last movement.
     * The token is displaced to the prior recorded position and the movement history it rolled back accordingly.
     * @param movementId The ID of the recorded movement to undo
     * @returns True if the movement was undone, otherwise false
     */
    revertRecordedMovement(movementId?: string): Promise<boolean>;

    /**
     * Resize the token Token such that its center point remains (almost) unchanged. The center point might change
     * slightly because the new (x, y) position is rounded.
     * @param dimensions The new dimensions
     * @param options Parameters of the update operation
     * @returns  A Promise that resolves to true if the Token was resized, otherwise resolves to false
     */
    resize(
        dimensions?: Partial<TokenDimensions>,
        options?: Partial<Omit<DatabaseUpdateOperation<TParent>, "updates">>,
    ): Promise<boolean>;

    /**
     * Stop the movement of this Token document. The movement cannot be continued after being stopped.
     * Only the User that initiated the movement can stop it.
     * @returns True if the movement was or is stopped, otherwise false
     */
    stopMovement(): boolean;

    /**
     * Pause the movement of this Token document. The movement can be resumed after being paused.
     * Only the User that initiated the movement can pause it.
     * Returns a callback that can be used to resume the movement later.
     * Only after all callbacks and keys have been called the movement of the Token is resumed.
     * If the callback is called within the update operation workflow, the movement is resumed after the workflow.
     * @returns The callback to resume movement if the movement was or is paused, otherwise null
     * @overload
     * @example
     * ```js
     * // This is an Execute Script Region Behavior that makes the token invisible
     * // On TOKEN_MOVE_IN...
     * if ( !event.user.isSelf ) return;
     * const resumeMovement = event.data.token.pauseMovement();
     * event.data.token.toggleStatusEffect("invisible", {active: true});
     * const resumed = await resumeMovement();
     * ```
     */
    pauseMovement(): TokenResumeMovementCallback | null;

    /**
     * Pause the movement of this Token document. The movement can be resumed after being paused.
     * Only the User that initiated the movement can pause it.
     * Returns a promise that resolves to true if the movement was resumed by
     * {@link TokenDocument#resumeMovement} with the same key that was passed to this function.
     * Only after all callbacks and keys have been called the movement of the Token is resumed.
     * If the callback is called within the update operation workflow, the movement is resumed after the workflow.
     * @param key The key to resume movement with {@link TokenDocument#resumeMovement}
     * @returns The continuation promise if the movement was paused, otherwise null
     * @overload
     * @example
     * ```js
     * // This is an Execute Script Region Behavior of a pressure plate that activates a trap
     * // On TOKEN_MOVE_IN...
     * if ( event.user.isSelf ) {
     *   event.data.token.pauseMovement(this.parent.uuid);
     * }
     * if ( game.user.isActiveGM ) {
     *   const trapUuid; // The Region Behavior UUID of the trap
     *   const trapBehavior = await fromUuid(trapUuid);
     *   await trapBehavior.update({disabled: false});
     *   event.data.token.resumeMovement(event.data.movement.id, this.parent.uuid);
     * }
     * ```
     */
    pauseMovement(key: string): Promise<boolean> | null;

    /**
     * Resume the movement given its ID and the key that was passed to {@link TokenDocument#pauseMovement}.
     * @param movementId The movement ID
     * @param key The key that was passed to {@link TokenDocument#pauseMovement}
     */
    resumeMovement(movementId: string, key: string): void;

    /**
     * Measure the movement path for this Token.
     * @param waypoints The waypoints of movement
     * @param options Additional measurement options
     * @param options.cost The function that returns the cost
     *   for a given move between grid spaces (default is the distance travelled along the direct path)
     */
    measureMovementPath(
        waypoints: TokenMeasureMovementPathWaypoint[],
        options?: { cost?: TokenMovementCostFunction },
    ): GridMeasurePathResult;

    /**
     * Get the path of movement with the intermediate steps of the direct path between waypoints.
     * @param waypoints The waypoints of movement
     * @returns The path of movement with all intermediate steps
     */
    getCompleteMovementPath(waypoints: TokenGetCompleteMovementPathWaypoint[]): TokenCompleteMovementWaypoint[];

    /* -------------------------------------------- */
    /*  Combat Operations                           */
    /* -------------------------------------------- */

    /**
     * Add or remove this Token from a Combat encounter.
     * @param options Additional options passed to TokenDocument.createCombatants or TokenDocument.deleteCombatants
     * @param options.active Require this token to be an active Combatant or to be removed. Otherwise, the current
     *                       combat state of the Token is toggled.
     * @returns Is this Token now an active Combatant?
     */
    toggleCombatant(options?: Partial<DatabaseOperation<TParent>> & { active?: boolean }): Promise<boolean>;

    /**
     * Create or remove Combatants for an array of provided Token objects.
     * @param tokens The tokens which should be added to the Combat
     * @param options Options which modify the toggle operation
     * @param options.combat A specific Combat instance which should be modified. If undefined, the current active
     *                       combat will be modified if one exists. Otherwise, a new Combat encounter will be created if
     *                       the requesting user is a Gamemaster.
     * @returns An array of created Combatant documents
     */
    static createCombatants(tokens: TokenDocument[], options?: { combat?: Combat }): Promise<Combatant[]>;

    /**
     * Remove Combatants for the array of provided Tokens.
     * @param tokens The tokens which should removed from the Combat
     * @param options Options which modify the operation
     * @param options.combat A specific Combat instance from which Combatants should be deleted
     * @returns An array of deleted Combatant documents
     */
    static deleteCombatants(tokens: TokenDocument[], options?: { combat?: Combat }): Promise<Combatant[]>;

    /* -------------------------------------------- */
    /*  Actor Data Operations                       */
    /* -------------------------------------------- */

    /**
     * Convenience method to change a token vision mode.
     * @param visionMode The vision mode to apply to this token.
     * @param defaults If the vision mode should be updated with its defaults.
     * @returns The updated Document instance, or undefined not updated.
     */
    updateVisionMode(visionMode: string, defaults?: boolean): Promise<TokenDocument | undefined>;

    override getEmbeddedCollection(embeddedName: string): foundry.abstract.EmbeddedCollection<Document<Document>>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void;

    protected override _preUpdate(
        data: Record<string, unknown>,
        options: TokenUpdateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: TokenUpdateCallbackOptions,
        userId: string,
    ): void;

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;

    /**
     * Identify the Regions the Token currently is or is going to be in after the changes are applied.
     * @param changes The changes that will be applied to this Token
     * @returns The Region IDs this Token is in after the changes are applied (sorted)
     * @internal
     */
    _identifyRegions(changes?: DeepPartial<this["_source"]>): string[];

    static override _preCreateOperation(
        documents: Document[],
        operation: DatabaseCreateOperation<Document | null>,
        user: BaseUser,
    ): Promise<boolean | void>;

    static override _preUpdateOperation(
        documents: Document[],
        operation: DatabaseUpdateOperation<Document | null>,
        user: BaseUser,
    ): Promise<boolean | void>;

    /**
     * Reject the movement or modify the update operation as needed based on the movement.
     * Called after the movement for this document update has been determined.
     * The waypoints of movement are final and cannot be changed. The movement can only be rejected entirely.
     * @param movement The pending movement of this Token
     * @param operation The update operation
     * @returns If false, the movement is prevented
     */
    protected _preUpdateMovement(
        movement: DeepReadonly<Omit<TokenMovementOperation, "autoRotate" | "showRuler">> &
            Pick<TokenMovementOperation, "autoRotate" | "showRuler">,
        operation: Partial<DatabaseUpdateOperation<TParent>>,
    ): Promise<boolean | void>;

    /**
     * Post-process an update operation of a movement.
     * @param movement The movement of this Token
     * @param operation The update operation
     * @param user The User that requested the update operation
     */
    protected _onUpdateMovement(
        movement: DeepReadonly<TokenMovementOperation>,
        operation: Partial<DatabaseUpdateOperation<TParent>>,
        user: User,
    ): void;

    /**
     * Called when the current movement is stopped.
     */
    protected _onMovementStopped(): void;

    /**
     * Called when the current movement is paused.
     */
    protected _onMovementPaused(): void;

    /**
     * Called when the movement is recorded or cleared.
     */
    protected _onMovementRecorded(): void;

    static override _onCreateOperation<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        items: TDocument[],
        context: DatabaseCreateOperation<TDocument["parent"]>,
    ): Promise<void>;

    static override _onUpdateOperation(
        documents: Document[],
        operation: DatabaseUpdateOperation<Document | null>,
        user: BaseUser,
    ): Promise<void>;

    static override _onDeleteOperation(
        documents: Document[],
        operation: DatabaseDeleteOperation<Document | null>,
        user: BaseUser,
    ): Promise<void>;

    /**
     * Are these changes moving the Token from the given origin?
     * @param changes The (candidate) changes
     * @param origin The origin
     * @returns Is movement?
     * @internal
     */
    static _isMovementUpdate(changes: object, origin: TokenPosition): boolean;

    /**
     * Should the movement of this Token update be recorded in the movement history?
     * Called as part of the preUpdate workflow if the Token is moved.
     * @returns Should the movement of this Token update be recorded in the movement history?
     */
    protected _shouldRecordMovementHistory(): boolean;

    /**
     * Clear the movement history of this Token.
     */
    clearMovementHistory(): Promise<void>;

    /**
     * Is the Token document updated such that the Regions the Token is contained in may change?
     * Called as part of the preUpdate workflow.
     * @param changes The changes.
     * @returns Could this Token update change Region containment?
     */
    protected _couldRegionsChange(changes: object): boolean;

    /**
     * Test whether the Token is inside the Region.
     * This function determines the state of {@link TokenDocument#regions} and
     * {@link foundry.documents.RegionDocument#tokens}.
     * The Token and the Region must be in the same Scene.
     *
     * Implementations of this function are restricted in the following ways:
     *   - If the bounds (given by {@link TokenDocument#getSize}) of the Token do not intersect the
     *     Region, then the Token is not contained within the Region.
     *   - If the Token is inside the Region a particular elevation, then the Token is inside the Region at any elevation
     *     within the elevation range of the Region.
     *   - This function must not use prepared field values that are animated. In particular, it must use the source
     *     instead of prepared values of the following fields: `x`, `y`, `elevation`, `width`, `height`, and `shape`.
     *
     * If this function is overridden, then {@link TokenDocument#segmentizeRegionMovementPath} must be
     * overridden too.
     *
     * If an override of this function uses Token document fields other than `x`, `y`, `elevation`, `width`, `height`, and
     * `shape`, {@link TokenDocument#_couldRegionsChange} must be overridden to return true for changes
     * of these fields. If an override of this function uses non-Token properties other than `Scene#grid.type` and
     * `Scene#grid.size`,
     * {@link foundry.documents.Scene#updateTokenRegions} must be called when any of those properties change.
     * @param region The region.
     * @param data The position and dimensions. Defaults to the values of the document source.
     * @returns Is inside the Region?
     */
    testInsideRegion(region: RegionDocument, data?: Partial<ElevatedPoint & TokenDimensions>): boolean;

    /**
     * Split the Token movement path through the Region into its segments.
     * The Token and the Region must be in the same Scene.
     *
     * Implementations of this function are restricted in the following ways:
     *   - The segments must go through the waypoints.
     *   - The *from* position matches the *to* position of the succeeding segment.
     *   - The Token must be contained (w.r.t. {@link TokenDocument#testInsideRegion}) within the Region
     *     at the *from* and *to* of MOVE segments.
     *   - The Token must be contained (w.r.t. {@link TokenDocument#testInsideRegion}) within the Region
     *     at the *to* position of ENTER segments.
     *   - The Token must be contained (w.r.t. {@link TokenDocument#testInsideRegion}) within the Region
     *     at the *from* position of EXIT segments.
     *   - The Token must not be contained (w.r.t. {@link TokenDocument#testInsideRegion}) within the
     *     Region at the *from* position of ENTER segments.
     *   - The Token must not be contained (w.r.t. {@link TokenDocument#testInsideRegion}) within the
     *     Region at the *to* position of EXIT segments.
     *   - This function must not use prepared field values that are animated. In particular, it must use the source
     *     instead of prepared values of the following fields: `x`, `y`, `elevation`, `width`, `height`, and `shape`.
     * @param region The region
     * @param waypoints The waypoints of movement
     * @returns The movement split into its segments
     */
    segmentizeRegionMovementPath(
        region: RegionDocument,
        waypoints: TokenSegmentizeMovementWaypoint[],
    ): TokenRegionMovementSegment[];

    /* -------------------------------------------- */
    /*  Actor Delta Operations                      */
    /* -------------------------------------------- */

    /**
     * Support the special case descendant document changes within an ActorDelta.
     * The descendant documents themselves are configured to have a synthetic Actor as their parent.
     * We need this to ensure that the ActorDelta receives these events which do not bubble up.
     */
    protected override _preCreateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        data: object[],
        options: DatabaseCreateOperation<P>,
        userId: string,
    ): void;

    protected override _preUpdateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        changes: Record<string, unknown>[],
        options: DatabaseUpdateOperation<P>,
        userId: string,
    ): void;

    protected override _preDeleteDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        ids: string[],
        options: DatabaseDeleteOperation<P>,
        userId: string,
    ): void;

    protected override _onCreateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        documents: Document<P>[],
        data: object[],
        options: DatabaseCreateOperation<P>,
        userId: string,
    ): void;

    protected override _onUpdateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        documents: Document<P>[],
        changes: Record<string, unknown>[],
        options: DatabaseUpdateOperation<P>,
        userId: string,
    ): void;

    protected _onDeleteDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        documents: Document<P>[],
        ids: string[],
        options: DatabaseDeleteOperation<P>,
        userId: string,
    ): void;

    /**
     * When the base Actor for a TokenDocument changes, we may need to update its Actor instance
     * @param update The update delta
     * @param options The database operation that was performed
     * @internal
     */
    _onUpdateBaseActor(update?: Record<string, unknown>, options?: DatabaseUpdateCallbackOptions): void;

    /**
     * Whenever the token's actor delta changes, or the base actor changes, perform associated refreshes.
     * @param update The update delta.
     * @param options The options provided to the update.
     */
    protected _onRelatedUpdate(
        update?: { _id?: string; [key: string]: unknown } | { _id?: string; [key: string]: unknown }[],
        options?: Partial<DatabaseOperation<Document | null>>,
    ): void;

    /** Get an Array of attribute choices which could be tracked for Actors in the Combat Tracker */
    static getTrackedAttributes(data?: object, _path?: string[]): TrackedAttributesDescription;

    /**
     * Retrieve an Array of attribute choices from a plain object.
     * @param data The object to explore for attributes.
     */
    protected static _getTrackedAttributesFromObject(data: object, _path?: string[]): TrackedAttributesDescription;

    /**
     * Retrieve an Array of attribute choices from a SchemaField.
     * @param schema The schema to explore for attributes.
     */
    protected static _getTrackedAttributesFromSchema(
        schema: SchemaField,
        _path?: string[],
    ): TrackedAttributesDescription;

    /**
     * Retrieve any configured attributes for a given Actor type.
     * @param type The Actor type.
     */
    protected static _getConfiguredTrackedAttributes(type: string): TrackedAttributesDescription | void;

    /** Inspect the Actor data model and identify the set of attributes which could be used for a Token Bar */
    static getTrackedAttributeChoices(attributes?: TrackedAttributesDescription): TrackedAttributesDescription;
}

export default interface TokenDocument<TParent extends Scene | null = Scene | null> extends CanvasBaseToken<TParent> {
    get object(): Token<this> | null;
    get sheet(): TokenConfig;
    get uuid(): TokenDocumentUUID;

    update(
        data: Record<string, unknown>,
        operation?: Partial<TokenUpdateOperation<TParent>>,
    ): Promise<this | undefined>;
}

export interface TokenDocumentConstructionContext<
    TParent extends Scene | null,
    TActor extends Actor<TokenDocument> | null,
> extends DocumentConstructionContext<TParent> {
    actor?: TActor;
}

export interface TokenUpdateOperation<TParent extends Scene | null> extends DatabaseUpdateOperation<TParent> {
    embedded?: { embeddedName: string; hookData: { _id?: string }[] };
    animate?: boolean;
    pan?: boolean;
    teleport?: boolean;
    animation?: TokenAnimationOptions;
}

export interface TokenUpdateCallbackOptions
    extends Omit<TokenUpdateOperation<null>, "action" | "pack" | "parent" | "restoreDelta" | "noHook" | "updates"> {}

export {};
