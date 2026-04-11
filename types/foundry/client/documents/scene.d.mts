import { TokenAnimationOptions } from "@client/_types.mjs";
import Region from "@client/canvas/placeables/region.mjs";
import { ElevatedPoint } from "@common/_types.mjs";
import {
    DatabaseCreateCallbackOptions,
    DatabaseCreateOperation,
    DatabaseDeleteCallbackOptions,
    DatabaseUpdateCallbackOptions,
    DatabaseUpdateOperation,
} from "@common/abstract/_types.mjs";
import Document from "@common/abstract/document.mjs";
import EmbeddedCollection from "@common/abstract/embedded-collection.mjs";
import { EdgeRestrictionType, ImageFilePath } from "@common/constants.mjs";
import { LevelTexture } from "@common/documents/_types.mjs";
import { GridlessGrid, HexagonalGrid, SquareGrid } from "@common/grid/_module.mjs";
import SceneConfig from "../applications/sheets/scene-config.mjs";
import {
    AmbientLightDocument,
    AmbientSoundDocument,
    BaseScene,
    BaseUser,
    DrawingDocument,
    NoteDocument,
    NoteSource,
    RegionDocument,
    RegionSource,
    SceneSource,
    TileDocument,
    TokenDocument,
    TokenSource,
    User,
    WallDocument,
} from "./_module.mjs";
import {
    RegionSurface,
    SceneDimensions,
    SceneViewOptions,
    TokenMovementInstruction,
    TokenMovementOptions,
    TokenResizingInstruction,
} from "./_types.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";
import CompendiumCollection from "./collections/compendium-collection.mjs";
import Level from "./level.mjs";

type BaseSceneStatic = typeof BaseScene;
interface ClientBaseSceneStatic extends BaseSceneStatic, ClientDocumentStatic {}

declare const ClientBaseScene: {
    new (...args: any): BaseScene & ClientDocument<null>;
} & ClientBaseSceneStatic;

interface ClientBaseScene extends InstanceType<typeof ClientBaseScene> {}

/**
 * The client-side Scene document which extends the common BaseScene abstraction.
 * Each Scene document contains SceneData which defines its data schema.
 * @param [data={}]        Initial data provided to construct the Scene document
 */
export default class Scene extends ClientBaseScene {
    /**
     * Track the viewed position of each scene (while in memory only, not persisted)
     * When switching back to a previously viewed scene, we can automatically pan to the previous position.
     * @internal
     */
    protected _viewPosition: Record<string, never> | { x: number; y: number; scale: number };

    /**
     * Track whether the scene is the active view
     * @internal
     */
    protected _view: boolean;

    /** The grid instance */
    grid: GridlessGrid | HexagonalGrid | SquareGrid;

    /** The gridless version of the grid instance. */
    gridlessGrid: GridlessGrid;

    /** Determine the canvas dimensions this Scene would occupy, if rendered */
    dimensions: SceneDimensions;

    /**
     * Have the edges of this Scene been initialized already?
     *
     * The property becomes true we moment {@link Scene#initializeEdges} is called.
     */
    get initializedEdges(): boolean;

    /**
     * The levels that are available to this User due to them owning a Token on it.
     * @type {Set<Level>}
     */
    get availableLevels(): Set<Level>;

    /** Provide a thumbnail image path used to represent this document. */
    get thumbnail(): string;

    /** A convenience accessor for whether the Scene is currently viewed */
    get isView(): boolean;

    /* -------------------------------------------- */
    /*  Scene Methods                               */
    /* -------------------------------------------- */

    protected override _configure(options?: { pack?: string | null; parentCollection?: string | null }): void;

    /**
     * Pull the specified users to this Scene.
     * @param users The User documents or IDs.
     * @param viewOptions The view options.
     * @example Pull all users to the viewed scene.
     * ```js
     * canvas.scene.pullUsers(game.users);
     * ```
     */
    pullUsers(users: Iterable<User | string>, viewOptions?: SceneViewOptions): void;

    /**
     * Set this scene as currently active
     * @return A Promise which resolves to the current scene once it has been successfully activated
     */
    activate(): Promise<this>;

    /**
     * Set this scene as the current view
     * @param options The view options
     */
    view(options?: SceneViewOptions): Promise<this>;

    /**
     * Unview this Scene, if it is the viewed Scene, clearing the game canvas.
     */
    unview(): Promise<void>;

    override clone(data?: Record<string, unknown>, context?: DocumentCloneContext): this;

    override reset(): void;

    override toObject(source?: boolean): this["_source"];

    override prepareBaseData(): void;

    override prepareEmbeddedDocuments(): void;

    override prepareDerivedData(): void;

    /**
     * Get the Canvas dimensions which would be used to display this Scene.
     * Apply padding to enlarge the playable space and round to the nearest 2x grid size to ensure symmetry.
     * The rounding accomplishes that the padding buffer around the map always contains whole grid spaces.
     */
    getDimensions(): SceneDimensions;

    protected _onClickDocumentLink(event: PointerEvent): this["sheet"] | Promise<this["sheet"]> | null;

    /**
     * Clear the movement history of all Tokens within this Scene.
     */
    clearMovementHistories(): Promise<void>;

    /**
     * For the given Tokens in this Scene identify the Regions that each Token is contained in and update the regions of
     * each Token accordingly.
     *
     * This function doesn't need to be called by the systems/modules unless
     * {@link foundry.documents.TokenDocument#testInsideRegion} is overridden and non-Token properties other than
     * `Scene#grid.type` and `Scene#grid.size` change that are used in the override of
     * {@link foundry.documents.TokenDocument#testInsideRegion}.
     * @param tokens The Tokens whoses regions should be updates
     * @returns The array of Tokens whose regions changed
     */
    updateTokenRegions(tokens?: Iterable<TokenDocument<this>>): Promise<TokenDocument<this>>;

    protected override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    /**
     * Update the shape constraints of all Regions the current User is designated for
     * (for the given restriction types).
     * @param types The types to update. Default: all.
     */
    updateRegionShapeConstraints(types: Iterable<EdgeRestrictionType>): void;

    /**
     * Update the shape constraints of the given Regions if the current User is designated for it.
     * @internal
     */
    _updateRegionShapeConstraints(region: Region): void;

    /**
     * Move/resize multiple Tokens.
     * @param instructions The movement/resizing instructions.
     * @param options Parameters of the update and movement operation.
     * @returns A Promise that resolves once all movement instructions are finished.
     *   The resolved value is an object with token IDs as keys and booleans as values that indicate whether the movement
     *   the token with the corresponding ID was completed (`true`) or stopped/prevented (`false`).
     * @see {@link TokenDocument#move}
     * @see {@link TokenDocument#resize}
     * @example
     * ```js
     * const results = await scene.moveTokens({
     *    // Moving the token to new position including additional token data
     *   "cGYT0rR0YbtFkhzT": {
     *     destination: {x: 100, y: 200, rotation: 45, texture: {tint: "#ff0000"}},
     *     showRuler: false, // This overrides `options.showRuler`
     *   },
     *   // Moving the token to along a path with multiple waypoints
     *   "wBFpJuZuleEtVNw1": {
     *     waypoints: [
     *       {x: 100, y: 200}, // Move to the position (100, 200)
     *       {elevation: 5, explicit: true}, // Move to elevation 5 indicating that the user placed this waypoint
     *       {x: 500, y: 500, checkpoint: true}, // Move to (500, 500): the movement can be stopped/paused here
     *       {width: 2, height: 2, depth: 2}, // Change size
     *       {x: 1000, action: "swim"}, // Swim to (1000, 500)
     *       {x: 0, y: 0, snapped: true}, // Move to (0, 0) indicating that (0, 0) is a snapped position for the token
     *       {elevation: 10} // Move to elevation 10 (the last waypoint is always a checkpoint automatically)
     *     ],
     *     autoRotate: true,
     *     constrainOptions: {ignoreWalls: true, ignoreCost: true} // Allow the token to move through walls, surfaces, and
     *                                                             // impassable terrain
     *   },
     *   // Resizing the token including additional token data
     *   "VupAIbzpX6SHqtaH": {
     *     dimensions: {width: 3, height: 3, depth: 3, rotation: 45, texture: {tint: "#ff0000"}}
     *   }
     * }, {
     *   showRuler: true // This applies to all instructions that do not define `showRuler`
     * })
     * if ( results["cGYT0rR0YbtFkhzT"] ) {
     *   // The movement of Token [cGYT0rR0YbtFkhzT] was completed: it arrived at the destination
     * } else {
     *   // The movement of Token [cGYT0rR0YbtFkhzT] was stopped or prevented
     * }
     * if ( results["wBFpJuZuleEtVNw1"] ) {
     *   // The movement of Token [wBFpJuZuleEtVNw1] was completed: it arrived at the destination
     * } else {
     *   // The movement of Token [wBFpJuZuleEtVNw1] was stopped or prevented
     * }
     * if ( results["VupAIbzpX6SHqtaH"] ) {
     *   // The resizing of Token [VupAIbzpX6SHqtaH] was completed
     * } else {
     *   // The resizing of Token [VupAIbzpX6SHqtaH] was prevented
     * }
     * ```
     */
    moveTokens(
        instructions: Record<string, TokenMovementInstruction | TokenResizingInstruction>,
        options: DatabaseUpdateCallbackOptions & Omit<TokenMovementOptions, "id">,
    ): Promise<Record<string, boolean>>;

    /**
     * Invalidate cached surface data.
     * @internal
     */
    _invalidateSurfaces(): void;

    /**
     * Get all surfaces or surfaces matching the filter.
     * @param options Additional options
     * @param options.type Only return surfaces that restrict this type
     * @param options.level Only return surfaces that are included in this Level
     * @param options.occlusion Only return surfaces that have this value as {@link RegionSurface#occlusion}
     * @param options.exposure Only return surfaces that have this value as {@link RegionSurface#exposure}
     */
    getSurfaces(options: {
        type?: EdgeRestrictionType;
        level?: Level | string;
        occlusion?: boolean;
        exposure?: boolean;
    }): DeepReadonly<RegionSurface[]>;

    /**
     * Test for surface collision for a movement between two points.
     * @param origin The origin.
     * @param destination The destination.
     * @param config Configuration.
     * @param config.type The restriction type. Default: `"move"`.
     * @param config.mode The collision mode. Default: `"any"`.
     * @param config.side The side of the surface that counts as colliding when the ray originates on the surface.
     * Default: `"below"`.
     *   - `"below"`: Treats the surface as solid in the negative z-direction. Rays originating on the surface will
     *      collide if they point downward (z < 0) and will not collide if they point upward.
     *   - `"above"`: Treats the surface as solid in the positive z-direction. Rays originating on the surface will
     *      collide if they point upward (z > 0) and will not collide if they point downward.
     * @param config.tMin Intersections of the ray and a surface with t-value less than `tMin` are not considered
     *                    collisions. Default: `0`.
     * @param config.tMax Intersections of the ray and a surface with t-value greater than `tMax` are not considered
     *                    collisions. Default: `1`.
     * @param config.level The Level or Level ID to test collision in.
     * @returns The collision result depends on the mode of the test:
     *   - `"any"`: Returns a boolean for whether any collision occurred.
     *   - `"all"`: Returns a sorted array of `ElevatedPoint` instances.
     *   - `"closest"`: Returns an `ElevatedPoint` instance or null.
     */
    testSurfaceCollision(
        origin: ElevatedPoint,
        destination: ElevatedPoint,
        config?: {
            type?: EdgeRestrictionType;
            mode?: "any" | "all" | "closest";
            side?: "below" | "above";
            tMin?: number;
            tMax?: number;
            level: Level | string;
        },
    ): boolean | ElevatedPoint | ElevatedPoint[] | null;

    /* -------------------------------------------- */
    /*  Scene Levels                                */
    /* -------------------------------------------- */

    /**
     * Cycle the currently viewed Level for this Scene.
     */
    cycleLevel(direction: -1 | 1): Promise<void>;

    /**
     * Get textures that should be used for the currently active level.
     * @internal
     */
    _configureLevelTextures(): (LevelTexture & {
        level: Level;
        name: string;
        elevation: number;
        sort: number;
        zIndex: number;
        isBackground: boolean;
        isUpper: boolean;
    })[];

    /**
     * Reset the edges of this Scene.
     * @internal
     */
    _resetEdges(): void;

    /**
     * Initialize the edges of this Scene unless they already have been inititalized.
     */
    initializeEdges(): void;

    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void;

    protected override _preUpdate(
        data: Record<string, unknown>,
        options: SceneUpdateOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    override _onUpdate(changed: DeepPartial<this["_source"]>, options: SceneUpdateOptions, userId: string): void;

    protected override _preDelete(options: DatabaseDeleteCallbackOptions, user: BaseUser): Promise<boolean | void>;

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;

    /**
     * Handle Scene activation workflow if the active state is changed to true
     * @param active Is the scene now active?
     */
    protected _onActivate(active: boolean): Promise<this>;

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

    protected _onUpdateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        documents: Document<P>[],
        changes: Record<string, unknown>[],
        options: DatabaseUpdateOperation<P>,
        userId: string,
    ): void;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    override toCompendium(pack: CompendiumCollection): this["_source"];

    /**
         * Create a 300px by 100px thumbnail image for this scene background
         * @param [string|null] A background image to use for thumbnail creation, otherwise the current scene background
                                is used.
         * @param [width]       The desired thumbnail width. Default is 300px
         * @param [height]      The desired thumbnail height. Default is 100px;
         * @return The created thumbnail data.
         */
    createThumbnail({
        img,
        width,
        height,
    }?: {
        img?: ImageFilePath | null;
        width?: number;
        height?: number;
    }): Promise<Record<string, unknown>>;
}

export default interface Scene extends ClientBaseScene {
    readonly _source: SceneSource;

    readonly drawings: EmbeddedCollection<DrawingDocument<this>>;
    readonly lights: EmbeddedCollection<AmbientLightDocument<this>>;
    readonly notes: EmbeddedCollection<NoteDocument<this>>;
    readonly regions: EmbeddedCollection<RegionDocument<this>>;
    readonly sounds: EmbeddedCollection<AmbientSoundDocument<this>>;
    readonly tokens: EmbeddedCollection<TokenDocument<this>>;
    readonly tiles: EmbeddedCollection<TileDocument<this>>;
    readonly walls: EmbeddedCollection<WallDocument<this>>;

    get sheet(): SceneConfig<this>;

    getEmbeddedCollection(embeddedName: "Token"): this["tokens"];

    update(data: Record<string, unknown>, options?: Partial<SceneUpdateOptions>): Promise<this>;

    createEmbeddedDocuments(
        embeddedName: "Note",
        data: PreCreate<NoteSource>[],
        operation?: DatabaseCreateOperation<this>,
    ): Promise<CollectionValue<this["notes"]>[]>;
    createEmbeddedDocuments(
        embeddedName: "Token",
        data: PreCreate<TokenSource>[],
        operation?: DatabaseCreateOperation<this>,
    ): Promise<CollectionValue<this["tokens"]>[]>;
    createEmbeddedDocuments(
        embeddedName: "Region",
        data: PreCreate<RegionSource>[],
        context?: DatabaseCreateOperation<this>,
    ): Promise<CollectionValue<this["regions"]>[]>;
    createEmbeddedDocuments(
        embeddedName: SceneEmbeddedName,
        data: Record<string, unknown>[],
        operation?: DatabaseCreateOperation<this>,
    ): Promise<
        | CollectionValue<this["drawings"]>[]
        | CollectionValue<this["lights"]>[]
        | CollectionValue<this["notes"]>[]
        | CollectionValue<this["regions"]>[]
        | CollectionValue<this["sounds"]>[]
        | CollectionValue<this["tiles"]>[]
        | CollectionValue<this["tokens"]>[]
        | CollectionValue<this["tokens"]>[]
        | CollectionValue<this["walls"]>[]
    >;

    updateEmbeddedDocuments(
        embeddedName: "AmbientLight",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["lights"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "AmbientSound",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["sounds"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Drawing",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["drawings"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "MeasuredTemplate",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["tokens"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Note",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["notes"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Region",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseCreateOperation<this>>,
    ): Promise<CollectionValue<this["regions"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Tile",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["tiles"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Token",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<EmbeddedTokenUpdateOperation<this>>,
    ): Promise<CollectionValue<this["tokens"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Wall",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["walls"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: SceneEmbeddedName,
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<
        | CollectionValue<this["drawings"]>[]
        | CollectionValue<this["lights"]>[]
        | CollectionValue<this["notes"]>[]
        | CollectionValue<this["regions"]>[]
        | CollectionValue<this["sounds"]>[]
        | CollectionValue<this["tiles"]>[]
        | CollectionValue<this["tokens"]>[]
        | CollectionValue<this["tokens"]>[]
        | CollectionValue<this["walls"]>[]
    >;
}

export interface SceneUpdateOptions extends DatabaseUpdateCallbackOptions {
    animateDarkness?: number;
}

export interface EmbeddedTokenUpdateOperation<TParent extends Scene> extends DatabaseUpdateOperation<TParent> {
    /** Is the operation undoing a previous operation, only used by embedded Documents within a Scene */
    isUndo?: boolean;
    animation?: TokenAnimationOptions;
}

export type SceneTokenOperation<TParent extends Scene> = SceneEmbeddedOperation<TParent> & {
    animation?: TokenAnimationOptions;
};

export type SceneEmbeddedName =
    | "AmbientLight"
    | "AmbientSound"
    | "Drawing"
    | "MeasuredTemplate"
    | "Note"
    | "Region"
    | "Tile"
    | "Token"
    | "Wall";

export {};
