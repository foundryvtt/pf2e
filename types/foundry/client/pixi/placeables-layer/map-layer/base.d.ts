/**
 * A PlaceablesLayer designed for rendering the visual Scene for a specific vertical cross-section.
 * Each MapLayer contains a single background image as well as an arbitrary number of Tile objects.
 */
declare abstract class MapLayer extends PlaceablesLayer<Tile> {
    constructor({ bgPath, level }?: { bgPath?: string; level?: number });

    /** The numeric Scene level to which this layer belongs */
    level: number;

    /** The background source path */
    bgPath: VideoFilePath;

    /** The layer background image */
    bg: PIXI.Sprite;

    static documentName: "Tile";

    /* -------------------------------------------- */
    /*  Layer Attributes                            */
    /* -------------------------------------------- */

    static override get layerOptions(): MapLayerOptions;

    /** Return the base HTML image or video element which is used to generate the background Sprite.*/
    get bgSource(): HTMLImageElement | HTMLVideoElement;

    get hud(): TileHUD;

    /** Is the background texture used in this layer a video? */
    get isVideo(): boolean;

    /** An array of Tile objects which are rendered within the objects container */
    get tiles(): Tile;

    /* -------------------------------------------- */
    /*  Layer Methods                               */
    /* -------------------------------------------- */

    override deactivate(): this;

    override tearDown(): Promise<void>;

    /* -------------------------------------------- */
    /*  Layer Rendering                             */
    /* -------------------------------------------- */

    override draw(): Promise<this>;

    /**
     * Draw the background Sprite for the layer, aligning its dimensions with those configured for the canvas.
     * @returns The rendered Sprite, or undefined if no background is present
     */
    protected _drawBackground(): PIXI.Sprite | undefined;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onDragLeftStart(event: PIXI.InteractionEvent): Promise<void>;

    protected override _onDragLeftMove(event: PIXI.InteractionEvent): Promise<void>;

    protected override _onDragLeftDrop(event: PIXI.InteractionEvent): Promise<void>;

    protected override _onDragLeftCancel(event: PIXI.InteractionEvent): void;

    /**
     * Handle drop events for Tile data on the Tiles Layer
     * @param event The concluding drag event
     * @param data  The extracted Tile data
     */
    protected _onDropData(event: PIXI.InteractionEvent, data: Record<string, Tile>): Promise<TileDocument>;

    /**
     * Prepare the data object when a new Tile is dropped onto the canvas
     * @param event The concluding drag event
     * @param data  The extracted Tile data
     * @returns The prepared data to create
     */
    protected _getDropData(
        event: PIXI.InteractionEvent,
        data: foundry.data.TileSource
    ): Promise<foundry.data.TileSource>;
}

declare interface MapLayerOptions extends PlaceablesLayerOptions {
    name: string;
    zIndex: number;
    controllableObjects: true;
    rotatableObjects: true;
}
