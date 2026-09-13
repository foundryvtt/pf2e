import PlaceableObject from "@client/canvas/placeables/placeable-object.mjs";
import { Point } from "@common/_types.mjs";
import { BaseShapeData, RingShapeData, SpecificShapeData } from "@common/data/data.mjs";
import { PlaceablesLayerOptions } from "../_types.mjs";
import PlaceablesLayer, { PlaceablesLayerPointerEvent } from "../base/placeables-layer.mjs";

// System note: this is a mixin in the upstream client codebase, but it only ever extends `PlaceablesLayer`

interface ShapeLayerOptions extends PlaceablesLayerOptions {
    /**
     * The shape types that are allowed to be empty for the creation of a drawn object.
     */
    allowedEmptyShapes: string[];
    /**
     * Discard the closing point of a polygon shape?
     */
    discardClosingPoint: boolean;
}

export class ShapeLayer<TObject extends PlaceableObject = PlaceableObject> extends PlaceablesLayer<TObject> {
    static override get layerOptions(): ShapeLayerOptions;

    // TODO: https://github.com/foundryvtt/foundryvtt/issues/13831
    /**
     * The mouse wheel context.
     * @internal
     */
    _mouseWheelContext: { preview: TObject; shape: BaseShapeData } | null;

    override getSnappedPoint(point: Point): Point;

    protected override _deactivate(): void;

    protected override _tearDown(options?: object): Promise<void>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onClickLeft2(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _canDragLeftStart(user: User, event: PlaceablesLayerPointerEvent<TObject>): boolean;

    protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftDrop(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _commitDragLeftDrop(event: PlaceablesLayerPointerEvent<TObject>): Promise<void>;

    protected override _onDragLeftCancel(event: PlaceablesLayerPointerEvent<PlaceableObject>): void;

    /**
     * Create the shape data from the drag start event.
     * @param event The pointer event
     * @returns The initial shape data
     */
    protected _createDragShapeData(
        event: PIXI.FederatedEvent,
    ): DeepPartial<Exclude<SpecificShapeData, RingShapeData>["_source"]>;

    /**
     * Update the drag preview. Called when the shape has changed.
     * @param event The pointer event
     */
    protected _updateDragPreview(event: PIXI.FederatedEvent): void;

    protected override _onMouseWheel(event: WheelEvent): void;

    /**
     * Cancel mouse wheel rotation.
     */
    protected _cancelMouseWheel(): void;

    /**
     * Rotate the shape of the preview.
     * @param event The mouse wheel event
     */
    protected _updateMouseWheelShape(event: WheelEvent): void;

    /**
     * Update the mouse wheel rotation preview.
     */
    protected _updateMouseWheelPreview(): void;

    /**
     * Prepare the database update that should occur as the result of a mouse wheel rotation.
     * @returns The update data and options (optional)
     */
    protected _prepareMouseWheelUpdate(): object | [data: object, options?: object];
}

/**
 * A mixin for UX shared between PlaceablesLayer with objects that have shapes.
 * @param {typeof PlaceablesLayer} Base    The PlaceablesLayer (sub)class.
 */
export default function ShapeLayerMixin(Base: typeof PlaceablesLayer): typeof ShapeLayer;
