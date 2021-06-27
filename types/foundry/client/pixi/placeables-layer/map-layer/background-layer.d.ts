/** An extension of the MapLayer that displays underfoot in the background of the Scene. */
declare class BackgroundLayer extends MapLayer {
    /** The outline of the scene */
    outline: PIXI.Graphics;

    /* -------------------------------------------- */
    /*  Layer Methods                               */
    /* -------------------------------------------- */

    override draw(): Promise<this>;

    /** Draw a background outline which emphasizes what portion of the canvas is playable space and what is buffer. */
    protected _drawOutline(): PIXI.Graphics;

    override getDocuments(): TileDocument[];

    override getZIndex(): number;

    override storeHistory(type: string, data: Record<string, unknown>): void;
}
