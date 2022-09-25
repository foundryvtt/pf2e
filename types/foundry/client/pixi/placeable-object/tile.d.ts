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

        override get bounds(): PIXI.Rectangle;

        /** The HTML source element for the primary Tile texture */
        get sourceElement(): HTMLImageElement | HTMLVideoElement;

        /** Does this Tile depict an animated video texture? */
        get isVideo(): boolean;

        /** Is this tile a roof */
        get isRoof(): boolean;

        /** The effective volume at which this Tile should be playing, including the global ambient volume modifier */
        get volume(): number;

        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */

        protected _draw(): Promise<void>;

        override destroy(options: object): void;

        /**
         * @param [refreshPerception=false]  Also refresh the perception layer.
         */
        override refresh({ refreshPerception }?: { refreshPerception?: boolean }): this;

        /** Refresh the display of the Tile border */
        protected _refreshBorder(b: PIXI.Rectangle): void;

        /** Refresh the display of the Tile resizing handle */
        protected _refreshHandle(b: PIXI.Rectangle): void;

        /* -------------------------------------------- */
        /*  Event Handlers                              */
        /* -------------------------------------------- */

        override _onUpdate(
            changed: DeepPartial<TDocument["_source"]>,
            options: DocumentModificationContext<TDocument>,
            userId: string
        ): void;

        override _onDelete(options: DocumentModificationContext<TDocument>, userId: string): void;

        /**
         * Update wall states and refresh lighting and vision when a tile becomes a roof, or when an existing roof tile's
         * state changes.
         */
        protected _refreshPerception(): void;

        /* -------------------------------------------- */
        /*  Interactivity                               */
        /* -------------------------------------------- */

        override activateListeners(): void;

        protected override _canConfigure(user: User, event?: PIXI.InteractionEvent): boolean;

        protected override _onClickLeft2(event: PIXI.InteractionEvent): void;

        protected override _onDragLeftStart(event: PIXI.InteractionEvent): void;

        protected override _onDragLeftMove(event: PIXI.InteractionEvent): void;

        protected override _onDragLeftDrop(event: PIXI.InteractionEvent): Promise<this["document"][]>;

        protected override _onDragLeftCancel(event: PIXI.InteractionEvent): void;

        /* -------------------------------------------- */
        /*  Resize Handling                             */
        /* -------------------------------------------- */

        /**
         * Handle mouse-over event on a control handle
         * @param event The mouseover event
         */
        protected _onHandleHoverIn(event: PIXI.InteractionEvent): void;

        /**
         * Handle mouse-out event on a control handle
         * @param event The mouseout event
         */
        protected _onHandleHoverOut(event: PIXI.InteractionEvent): void;

        /**
         * When we start a drag event - create a preview copy of the Tile for re-positioning
         * @param event The mousedown event
         */
        protected _onHandleMouseDown(event: PIXI.InteractionEvent): void;

        /**
         * Handle the beginning of a drag event on a resize handle
         * @param event The mousedown event
         */
        protected _onHandleDragStart(event: PIXI.InteractionEvent): void;

        /**
         * Handle mousemove while dragging a tile scale handler
         * @param event The mousemove event
         */
        protected _onHandleDragMove(event: PIXI.InteractionEvent): void;

        /**
         * Handle mouseup after dragging a tile scale handler
         * @param event The mouseup event
         */
        protected _onHandleDragDrop(event: PIXI.InteractionEvent): void;

        /** Get resized Tile dimensions */
        protected _getResizedDimensions(event: PIXI.InteractionEvent, origin: Point, destination: Point): Rectangle;

        /** Handle cancellation of a drag event for one of the resizing handles */
        protected _onHandleDragCancel(): void;

        /**
         * Create a preview tile with a background texture instead of an image
         * @param data Initial data with which to create the preview Tile
         */
        static createPreview(data: DeepPartial<foundry.data.TileSource>): Tile;
    }

    interface Tile<TDocument extends TileDocument = TileDocument> extends PlaceableObject<TDocument> {
        get layer(): TilesLayer<this>;
    }
}

interface TileBorderFrame extends PIXI.Container {
    border: PIXI.Graphics;
    handle: ResizeHandle;
}
