/** An extension of the MapLayer that displays overhead in the foreground of the Scene. */
declare class ForegroundLayer extends MapLayer {
    occlusionMask: PIXI.Container;

    static get layerOptions(): MapLayerOptions & {
        name: "foreground";
    };

    /** Get an array of overhead Tile objects which are roofs */
    get roofs(): PIXI.DisplayObject[];

    /** Determine whether to display roofs */
    get displayRoofs(): boolean;

    /* -------------------------------------------- */
    /*  Layer Methods                               */
    /* -------------------------------------------- */

    override draw(): Promise<this>;

    /**
     * Draw the container used to cache the position of Token occlusion shapes to a RenderTexture
     * @returns {CachedContainer}
     * @todo define `CachedContainer`
     */
    protected _drawOcclusionMask(): PIXI.Container;

    override deactivate(): this;

    override tearDown(): Promise<void>;

    override getZIndex(): number;

    override getDocuments(): TileDocument[];

    /**
     * Refresh the display of tiles on the Foreground Layer depending on Token occlusion.
     */
    refresh(): void;

    /** Update occlusion for all tiles on the foreground layer */
    updateOcclusion(): void;

    /**
     * Draw the container which caches token-based occlusion shapes
     * @param tokens The set of currently observed tokens
     */
    protected _drawOcclusionShapes(tokens: Token[]): void;

    protected override _getDropData(
        event: PIXI.InteractionEvent,
        data: foundry.data.TileSource
    ): Promise<foundry.data.TileSource>;
}
