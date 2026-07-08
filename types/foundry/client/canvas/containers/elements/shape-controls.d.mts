import { RenderFlagsMixin } from "@client/canvas/interaction/render-flags.mjs";
import { PlaceablesLayerPointerEvent } from "@client/canvas/layers/base/placeables-layer.mjs";
import { PlaceableObject } from "@client/canvas/placeables/_module.mjs";
import Document from "@common/abstract/document.mjs";
import { BaseShapeData } from "@common/data/_module.mjs";

/**
 * Controls for a shape.
 */
export class ShapeControls<
    TDocument extends Document = Document,
    TObject extends PlaceableObject = PlaceableObject,
> extends RenderFlagsMixin(PIXI.Container) {
    /**
     * @param shape The shape.
     */
    constructor(shape: BaseShapeData);

    static override RENDER_FLAG_PRIORITY: "INTERFACE";

    static override RENDER_FLAGS: {
        redraw: { propagate: ["refresh"] };
        refresh: Record<string, never>;
    };

    /** The shape. */
    get shape(): BaseShapeData;

    /** The Document of this shape. */
    get document(): TDocument;

    /** The PlaceableObject of this shape. */
    get object(): TObject;

    /** The PlaceableLayer of this shape. */
    get layer(): TObject["layer"];

    /** The border of the shape. */
    get border(): PIXI.Graphics;

    /** The handles of the shape. */
    get handles(): PIXI.Container<ShapeControlsHandle>;

    /**
     * The tint applied to these controls.
     * @defaultValue 0xFFFFFF
     */
    get tint(): number;

    set tint(tint: number);

    /**
     * Are the controls editable?
     * @defaultValue true
     */
    editable: boolean;

    /**
     * Is the border dashed?
     * @defaultValue false
     */
    get dashed(): boolean;

    set dashed(value: boolean);

    /* -------------------------------------------- */
    /*  Incremental Refresh                         */
    /* -------------------------------------------- */

    override applyRenderFlags(): void;

    /** * Refresh the visualization of these controls.  */
    protected _refresh(): void;

    /** Refresh the visualization of these controls. */
    refresh(): void;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Draw the shape.
     * @param graphics
     */
    protected _drawShape(graphics: PIXI.Graphics): void;

    /** Draw the visualization of these controls. */
    draw(): Promise<this>;

    /** Draw these controls.*/
    protected _draw(): Promise<void>;

    /** Clear these controls. */
    protected _clear(): void;

    override destroy(options?: boolean | PIXI.IDestroyOptions): void;

    /* -------------------------------------------- */
    /*  Interactivity                               */
    /* -------------------------------------------- */

    /**
     * Can the handle be dragged?
     * @param event The pointer event
     * @param [options] Options, used internally
     */
    protected _canDragStart(event: PlaceablesLayerPointerEvent<TObject>, options?: { notify: boolean }): boolean;

    /**
     * Handle the drag start event of a handle.
     * @param event The pointer event.
     */
    protected _onDragStart(event: PlaceablesLayerPointerEvent<TObject>): void;

    /**
     * Create and draw the drag preview for a placeable object.
     * @param object The original placeable object
     * @returns      The preview of the placeable object.
     * @internal
     */
    static _createDragPreview(object: PlaceableObject): PlaceableObject;

    /**
     * Handle the drag move event of a handle.
     * @param event The pointer event.
     */
    protected _onDragMove(event: PlaceablesLayerPointerEvent<TObject>): void;

    /**
     * Update the drag preview. Called when the shape has changed.
     * @param event The pointer event.
     */
    protected _updateDragPreview(event: PlaceablesLayerPointerEvent<TObject>): void;

    _onDragDrop(event: PlaceablesLayerPointerEvent<TObject>): void;

    /**
     * Prepare the database update that should occur as the result of a drop operation.
     * @param event The pointer event.
     * @returns The update data and options (optional)
     */
    protected _prepareDragDropUpdate(
        event: PlaceablesLayerPointerEvent<TObject>,
    ): { shape: object } | { shapes: object };

    /**
     * Handle the drag cancel event of a handle.
     * @param event The pointer event.
     */
    protected _onDragCancel(event: PlaceablesLayerPointerEvent<TObject>): void;

    /**
     * Handle the double left-click event of a handle.
     * @param event The pointer event.
     */
    protected _onClick2(event: PlaceablesLayerPointerEvent<TObject>): void;
}

/**
 * A handle of a shape controls element.
 */
export class ShapeControlsHandle extends PIXI.smooth.SmoothGraphics {
    /**
     * @param controls The controls this handle belongs to.
     * @param name The name of this handle.
     */
    constructor(controls: ShapeControls, name: string);

    /** The controls that this handle belongs to. */
    get controls(): ShapeControls;

    /** Is hovered? */
    get hovered(): boolean;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Draw the handle.
     * @param style The style.
     */
    draw(style: { size: number; offset: number; outlineThickness: number }): Promise<void>;
}
