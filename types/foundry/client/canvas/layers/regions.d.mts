import RegionLegend from "@client/applications/ui/region-legend.mjs";
import User from "@client/documents/user.mjs";
import { Point } from "@common/_types.mjs";
import { BaseShapeData } from "@common/data/data.mjs";
import { SceneControl } from "../../applications/ui/scene-controls.mjs";
import Region from "../placeables/region.mjs";
import { CanvasHistoryEvent, PlaceablesLayerOptions } from "./_types.mjs";
import PlaceablesLayer, { PlaceablesLayerPointerEvent } from "./base/placeables-layer.mjs";

/**
 * The Regions Container.
 * @category Canvas
 */
export default class RegionLayer<TObject extends Region = Region> extends PlaceablesLayer<TObject> {
    static override get layerOptions(): PlaceablesLayerOptions;

    static override documentName: "Region";

    override get hookName(): string;

    /** The RegionLegend application of this RegionLayer. */
    get legend(): RegionLegend;

    /* -------------------------------------------- */
    /*  Methods
    /* -------------------------------------------- */

    protected override _activate(): void;

    protected override _deactivate(): void;

    override storeHistory(type: CanvasHistoryEvent["type"], data: object, options: object): void;

    override copyObjects(): TObject[];

    override getSnappedPoint(point: Point): Point;

    override getZIndex(): number;

    protected override _draw(options?: object): Promise<void>;

    /**
     * Highlight the shape or clear the highlight.
     * @param data  The shape to highlight, or null to clear the highlight
     * @internal
     */
    _highlightShape(data: BaseShapeData | null): void;

    static override prepareSceneControls(): SceneControl;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): Promise<void>;

    protected override _onClickLeft2(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _canDragLeftStart(user: User, event: PlaceablesLayerPointerEvent<TObject>): boolean;

    protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftDrop(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftCancel(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onClickRight(event: PlaceablesLayerPointerEvent<TObject>): void;
}
