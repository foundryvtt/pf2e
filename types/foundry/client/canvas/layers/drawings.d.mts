import DrawingHUD from "@client/applications/hud/drawing-hud.mjs";
import { Point } from "@common/_types.mjs";
import Collection from "@common/utils/collection.mjs";
import { SceneControl } from "../../applications/ui/scene-controls.mjs";
import Drawing from "../placeables/drawing.mjs";
import { PlaceablesLayerOptions } from "./_types.mjs";
import PlaceablesLayer, { PlaceablesLayerPointerEvent } from "./base/placeables-layer.mjs";

/**
 * The DrawingsLayer subclass of PlaceablesLayer.
 * This layer implements a container for drawings.
 * @category Canvas
 */
export default class DrawingsLayer<TObject extends Drawing = Drawing> extends PlaceablesLayer<TObject> {
    static get layerOptions(): PlaceablesLayerOptions;

    static override documentName: "Drawing";

    /** The named game setting which persists default drawing configuration for the User */
    static DEFAULT_CONFIG_SETTING: string;

    /** The collection of drawing objects which are rendered in the interface. */
    graphics: Collection<string, TObject>;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    override get hud(): DrawingHUD;

    override get hookName(): string;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override getSnappedPoint(point: Point): Point;

    override _getCopyableObjects(options: { cut?: boolean }): TObject[];

    /** Render a configuration sheet to configure the default Drawing settings */
    configureDefault(): void;

    protected override _deactivate(): void;

    protected override _draw(options?: object): Promise<void>;

    /**
     * Get initial data for a new drawing.
     * Start with some global defaults, apply user default config, then apply mandatory overrides per tool.
     * @param origin  The initial coordinate
     * @returns  The new drawing data
     */
    protected _getNewDrawingData(origin: Point): TObject["document"]["_source"];

    static override prepareSceneControls(): SceneControl;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onClickLeft2(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftDrop(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftCancel(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onClickRight(event: PlaceablesLayerPointerEvent<TObject>): void;
}
