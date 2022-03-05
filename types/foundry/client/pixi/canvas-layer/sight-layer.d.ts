/**
 * The Sight Layer which implements dynamic vision, lighting, and fog of war
 * This layer uses an event-driven workflow to perform the minimal required calculation in response to changes.
 * @see {PointSource}
 *
 * The container structure of this layer is as follows:
 * sight: SightLayer              The SightLayer itself
 *   msk: PIXI.Graphics           A masking rectangle that restricts exploration to the scene background
 *   unexplored: PIXI.Graphics    An unexplored background that spans the entire scene canvas
 *   explored: PIXI.Container     The exploration container
 *      revealed: PIXI.Container  The container of areas which have been previously revealed
 *        saved: PIXI.Sprite      The saved FOW exploration texture from the database
 *        pending: PIXI.Container A container of pending exploration polygons that have not yet been saved
 *        roofs: PIXI.Container   A container of occluded roof sprites which should not be marked as explored
 *      current: PIXI.Container   The current vision container
 *        los: PIXI.Graphics      The current line-of-sight polygon
 *        fov: PIXI.Graphics      The current filed-of-view polygon
 *      msk: PIXI.Graphics        The masking rectangle that limits exploration to the Scene background
 *
 * @example <caption>The sightRefresh hook</caption>
 * Hooks.on("sightRefresh", layer => {});
 */
declare class SightLayer<
    TToken extends Token = Token,
    TFogExploration extends FogExploration<TToken> = FogExploration<TToken>
> extends CanvasLayer {
    constructor();

    /** The FogExploration document which applies to this canvas view */
    exploration: TFogExploration;

    /** A Collection of vision sources which are currently active within the rendered Scene. */
    sources: Collection<VisionSource<TToken>>;

    /** The canonical line-of-sight polygon which defines current Token visibility. */
    los: PIXI.Graphics;

    /** A cached container which creates a render texture used for the LOS mask. */
    losCache: CachedContainer;

    /** A status flag for whether the layer initialization workflow has succeeded */
    protected _initialized: boolean;

    /** The downscaling resolution used for the saved fog texture */
    protected _fogResolution: number;

    /** A pool of fog of war exploration containers that can be recycled */
    protected _visionPool: PIXI.Container[];

    /** Track whether fog of war exploration has been updated and required saving */
    protected _fogUpdated: boolean;

    /** Track the number of moves which have updated fog of war */
    protected _fogUpdates: number;

    /** A debounced function to save fog of war exploration once a stream of updates have stopped */
    debounceSaveFog: Function;

    /** Unexplored area is obscured by darkness. We need a larger rectangle so that the blur filter doesn't clip */
    unexplored?: PIXI.Graphics;

    /** Exploration container */
    explored?: PIXI.Container;

    /** Past exploration updates */
    revealed?: PIXI.Container;

    /** The current vision container */
    current: PIXI.Container;

    /**
     * Define the threshold value for the number of distinct Wall endpoints.
     * Below this threshold, exact vision computation is used by casting a Ray at every endpoint.
     * Above this threshold, approximate vision computation is used by culling to only nearby endpoints.
     */
    static EXACT_VISION_THRESHOLD: number;

    /**
     * Define the number of positions that are explored before a set of fog updates are pushed to the server.
     */
    static FOG_COMMIT_THRESHOLD: number;

    static override get layerOptions(): SightLayerOptions;

    saved: PIXI.Sprite;

    /** Does the currently viewed Scene support Token field of vision? */
    get tokenVision(): boolean;

    /** Does the currently viewed Scene support fog of war exploration? */
    get fogExploration(): boolean;

    /* -------------------------------------------- */
    /*  Layer Initialization                        */
    /* -------------------------------------------- */

    override tearDown(): Promise<void>;

    /** Initialize fog of war - resetting it when switching scenes or re-drawing the canvas */
    initializeFog(): Promise<void>;

    /** Initialize all Token sight sources which are present on this layer */
    initializeSources(): void;

    /* -------------------------------------------- */
    /*  Layer Rendering                             */
    /* -------------------------------------------- */

    override draw(): Promise<this>;

    /**
     * Construct a vision container that is used to render a single view position.
     * These containers are placed into the _visionPool and recycled as needed.
     */
    protected _createVisionContainer(): PIXI.Container;

    /**
     * Obtain a vision container from the recycling pool, or create one if no container exists.
     * Assign the container as the current fog exploration and the current LOS polygon.
     */
    protected _getVisionContainer(): PIXI.Container;

    /**
     * Return a vision container back to the pool, recycling it for future use.
     * @param c The container to recycle
     */
    protected _recycleVisionContainer(c: PIXI.Container): void;

    /**
     * Update the display of the sight layer.
     * Organize sources into rendering queues and draw lighting containers for each source
     *
     * @param [forceUpdateFog] Always update the Fog exploration progress for this update
     * @param [noUpdateFog]    Never update the Fog exploration progress for this update
     */
    refresh({ forceUpdateFog, noUpdateFog }?: { forceUpdateFog?: boolean; noUpdateFog?: boolean }): void;

    /**
     * Restrict the visibility of certain canvas assets (like Tokens or DoorControls) based on the visibility polygon
     * These assets should only be displayed if they are visible given the current player's field of view
     */
    restrictVisibility(): void;

    /**
     * Test whether a point on the Canvas is visible based on the current vision and LOS polygons
     *
     * @param point     The point in space to test, an object with coordinates x and y.
     * @param tolerance A numeric radial offset which allows for a non-exact match. For example, if
     *                  tolerance is 2 then the test will pass if the point is within 2px of a vision
     *                  polygon.
     * @param [object] An optional reference to the object whose visibility is being tested
     *
     * @return Whether the point is currently visible.
     */
    testVisibility(point: Point, { tolerance, object }?: { tolerance?: number; object?: PlaceableObject }): boolean;

    /* -------------------------------------------- */
    /*  Fog of War Management                       */
    /* -------------------------------------------- */

    /**
     * Once a new Fog of War location is explored, composite the explored container with the current staging sprite
     * Save that staging Sprite as the rendered fog exploration and swap it out for a fresh staging texture
     * Do all this asynchronously, so it doesn't block token movement animation since this takes some extra time
     */
    commitFog(): void;

    /** Load existing fog of war data from local storage and populate the initial exploration sprite */
    loadFog(): Promise<PIXI.Texture | void>;

    /**
     * Dispatch a request to reset the fog of war exploration status for all users within this Scene.
     * Once the server has deleted existing FogExploration documents, the _onResetFog handler will re-draw the canvas.
     */
    resetFog(): Promise<void>;

    /**
     * Save Fog of War exploration data to a base64 string to the FogExploration document in the database.
     * Assumes that the fog exploration has already been rendered as fog.rendered.texture.
     */
    saveFog(): Promise<void>;

    /**
     * Update the fog layer when a player token reaches a board position which was not previously explored
     * @param source The vision source for which the fog layer should update
     * @param force  Force fog to be updated even if the location is already explored
     */
    updateFog(source: PointSource<Token>, force?: boolean): boolean;

    /**
     * Choose an adaptive fog rendering resolution which downscales the saved fog textures for larger dimension Scenes
     */
    protected _configureFogResolution(): number;

    /** If fog of war data is reset from the server, re-draw the canvas */
    protected _handleResetFog(): Promise<void>;

    /* -------------------------------------------- */
    /*  Helper Functions                            */
    /* -------------------------------------------- */

    /**
     * Visualize the sight layer to understand algorithm performance.
     * @param bounds    The initial rectangular bounds of the vision check
     * @param endpoints The wall endpoints being tested
     * @param rays      The array of cast vision Rays
     * @param los       The resulting line-of-sight polygon
     * @param fov       The resulting field-of-vision polygon
     */
    protected _visualizeSight(
        bounds: PIXI.Rectangle,
        endpoints: PointArray[],
        rays: Ray[],
        los: PIXI.Polygon,
        fov: PIXI.Polygon
    ): void;
}

declare interface SightLayerOptions extends CanvasLayerOptions {
    name: "sight";
    zIndex: number;
}
