export {};

declare global {
    class Tile extends PlaceableObject<TileDocument> {
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

        /**
         * Get the native aspect ratio of the base texture for the Tile sprite
         */
        get aspectRatio(): number;
    }

    interface Tile extends PlaceableObject<TileDocument> {
        get layer(): TilesLayer<this>;
    }
}

interface TileBorderFrame extends PIXI.Container {
    border: PIXI.Graphics;
    handle: ResizeHandle;
}
