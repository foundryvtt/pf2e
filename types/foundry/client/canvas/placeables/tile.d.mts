import { Scene, TileDocument, User } from "@client/documents/_module.mjs";
import { DatabaseUpdateCallbackOptions } from "@common/abstract/_types.mjs";
import { TileSource } from "@common/documents/tile.mjs";
import { ResizeHandle } from "../containers/_module.mjs";
import { TilesLayer } from "../layers/_module.mjs";
import PrimarySpriteMesh from "../primary/primary-sprite-mesh.mjs";
import PlaceableObject from "./placeable-object.mjs";

/**
 * A PlaceablesLayer designed for rendering the visual Scene for a specific vertical cross-section.
 * @category - Canvas
 */
export default class Tile<
    TDocument extends TileDocument<Scene | null> = TileDocument<Scene | null>,
> extends PlaceableObject<TDocument> {
    static override embeddedName: "Tile";

    static override RENDER_FLAGS: Record<string, { propagate?: string[]; alias?: boolean }>;

    /* -------------------------------------------- */
    /*  Attributes                                  */
    /* -------------------------------------------- */

    /** The Tile border frame */
    frame: TileBorderFrame;

    /** The primary tile image texture */
    texture: PIXI.Texture;

    /** A Tile background which is displayed if no valid image texture is present */
    bg: PIXI.Graphics;

    /** A reference to the SpriteMesh which displays this Tile in the PrimaryCanvasGroup. */
    mesh: PrimarySpriteMesh;

    /** Get the native aspect ratio of the base texture for the Tile sprite */
    get aspectRatio(): number;

    override get bounds(): PIXI.Rectangle;

    /** The HTML source element for the primary Tile texture */
    get sourceElement(): HTMLImageElement | HTMLVideoElement | undefined;

    /** Does this Tile depict an animated video texture? */
    get isVideo(): boolean;

    /** Is this Tile currently visible on the Canvas? */
    get isVisible(): boolean;

    /** Is this tile occluded? */
    get occluded(): boolean;

    /** Is the tile video playing? */
    get playing(): boolean;

    /** The effective volume at which this Tile should be playing, including the global ambient volume modifier */
    get volume(): number;

    /* -------------------------------------------- */
    /*  Interactivity                               */
    /* -------------------------------------------- */

    protected override _overlapsSelection(rectangle: PIXI.Rectangle): boolean;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Create a preview tile with a background texture instead of an image
     * @param data Initial data with which to create the preview Tile
     */
    static createPreview(data: DeepPartial<TileSource>): Tile;

    protected _draw(): Promise<void>;

    override clear(options?: object): this;

    override _destroy(options: object): void;

    protected override _applyRenderFlags(flags: Record<string, boolean>): void;

    /** Refresh the position. */
    protected _refreshPosition(): void;

    /** Refresh the rotation. */
    protected _refreshRotation(): void;

    /** Refresh the size. */
    protected _refreshSize(): void;

    /**
     * Refresh the displayed state of the Tile.
     * Updated when the tile interaction state changes, when it is hidden, or when its elevation changes.
     */
    protected _refreshState(): void;

    /** Refresh the appearance of the tile. */
    protected _refreshMesh(): void;

    /** Refresh the elevation. */
    protected _refreshElevation(): void;

    /** Refresh the border frame that encloses the Tile. */
    protected _refreshFrame(): void;

    /** Refresh changes to the video playback state. */
    protected _refreshVideo(): void;

    /* -------------------------------------------- */
    /*  Document Event Handlers                     */
    /* -------------------------------------------- */

    override _onUpdate(
        changed: DeepPartial<TDocument["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    /* -------------------------------------------- */
    /*  Interactivity                               */
    /* -------------------------------------------- */

    override activateListeners(): void;

    protected override _canConfigure(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _onClickLeft2(event: PIXI.FederatedPointerEvent): void;

    protected override _onDragLeftStart(event: PIXI.FederatedPointerEvent): void;

    protected override _onDragLeftMove(event: PIXI.FederatedPointerEvent): void;

    protected override _onDragLeftDrop(event: PIXI.FederatedPointerEvent): Promise<this["document"][]>;

    protected override _onDragLeftCancel(event: PIXI.FederatedPointerEvent): void;

    /* -------------------------------------------- */
    /*  Resize Handling                             */
    /* -------------------------------------------- */

    /**
     * Handle mouse-over event on a control handle
     * @param event The mouseover event
     */
    protected _onHandleHoverIn(event: PIXI.FederatedPointerEvent): void;

    /**
     * Handle mouse-out event on a control handle
     * @param event The mouseout event
     */
    protected _onHandleHoverOut(event: PIXI.FederatedPointerEvent): void;

    /**
     * When we start a drag event - create a preview copy of the Tile for re-positioning
     * @param event The mousedown event
     */
    protected _onHandleMouseDown(event: PIXI.FederatedPointerEvent): void;

    /**
     * Handle the beginning of a drag event on a resize handle
     * @param event The mousedown event
     */
    protected _onHandleDragStart(event: PIXI.FederatedPointerEvent): void;

    /**
     * Handle mousemove while dragging a tile scale handler
     * @param event The mousemove event
     */
    protected _onHandleDragMove(event: PIXI.FederatedPointerEvent): void;

    /**
     * Handle mouseup after dragging a tile scale handler
     * @param event The mouseup event
     */
    protected _onHandleDragDrop(event: PIXI.FederatedPointerEvent): void;

    /** Handle cancellation of a drag event for one of the resizing handles */
    protected _onHandleDragCancel(): void;

    /**
     * Create a preview tile with a background texture instead of an image
     * @param data Initial data with which to create the preview Tile
     */
    static createPreview(data: DeepPartial<foundry.documents.TileSource>): Tile;
}

export default interface Tile<TDocument extends TileDocument<Scene | null> = TileDocument<Scene | null>>
    extends PlaceableObject<TDocument> {
    get layer(): TilesLayer<this>;
}

interface TileBorderFrame extends PIXI.Container {
    border: PIXI.Graphics;
    handle: ResizeHandle;
}
