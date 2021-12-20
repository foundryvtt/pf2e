export {};

declare global {
    /**
     * A Tile is an implementation of PlaceableObject which represents a static piece of artwork or prop within the Scene.
     * Tiles are drawn inside a {@link BackgroundLayer} container.
     *
     * @see {@link TileDocument}
     * @see {@link BackgroundLayer}
     * @see {@link TileSheet}
     * @see {@link TileHUD}
     */
    class Tile<TDocument extends TileDocument = TileDocument> extends PlaceableObject<TDocument> {
        /* -------------------------------------------- */
        /*  Attributes                                  */
        /* -------------------------------------------- */

        /** The Tile border frame */
        frame: TileBorderFrame;

        /**
         * The primary tile image texture
         */
        texture: PIXI.Texture;

        /** The Tile image sprite */
        tile: PIXI.Sprite;

        /** The occlusion image sprite */
        occlusionTile: PIXI.Sprite;

        /** A Tile background which is displayed if no valid image texture is present */
        bg: PIXI.Graphics;

        /** A cached mapping of non-transparent pixels */
        protected _alphaMap: {
            minX: number;
            minY: number;
            maxX: number;
            maxY: number;
            pixels: Uint8Array | undefined;
            texture: PIXI.RenderTexture | undefined;
        };

        /** A flag which tracks whether the overhead tile is currently in an occluded state */
        occluded: boolean;

        static override embeddedName: "Tile";

        /** Get the native aspect ratio of the base texture for the Tile sprite */
        get aspectRatio(): number;

        override get bounds(): NormalizedRectangle;

        /** The HTML source element for the primary Tile texture */
        get sourceElement(): HTMLImageElement | HTMLVideoElement;

        /** Does this Tile depict an animated video texture? */
        get isVideo(): boolean;

        /** Is this tile a roof */
        get isRoof(): boolean;

        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */

        override draw(): Promise<this>;

        override destroy(options: object): void;

        /**
         * @param [refreshPerception=false]  Also refresh the perception layer.
         */
        override refresh({ refreshPerception }?: { refreshPerception?: boolean }): this;
    }

    interface Tile<TDocument extends TileDocument = TileDocument> extends PlaceableObject<TDocument> {
        get layer(): TilesLayer<this>;
    }
}

interface TileBorderFrame extends PIXI.Container {
    border: PIXI.Graphics;
    handle: ResizeHandle;
}
