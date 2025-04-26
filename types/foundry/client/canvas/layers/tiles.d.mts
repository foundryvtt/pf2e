import TileHUD from "@client/applications/hud/tile-hud.mjs";
import { Point } from "@common/_types.mjs";
import { SceneControl } from "../../applications/ui/scene-controls.mjs";
import Tile from "../placeables/tile.mjs";
import { PlaceablesLayerOptions } from "./_types.mjs";
import PlaceablesLayer, { PlaceablesLayerPointerEvent } from "./base/placeables-layer.mjs";

/**
 * A PlaceablesLayer designed for rendering the visual Scene for a specific vertical cross-section.
 * @category Canvas
 */
export default class TilesLayer<TObject extends Tile = Tile> extends PlaceablesLayer<TObject> {
    static override documentName: "Tile";

    /* -------------------------------------------- */
    /*  Layer Attributes                            */
    /* -------------------------------------------- */

    static override get layerOptions(): PlaceablesLayerOptions;

    override get hookName(): string;

    override get hud(): TileHUD;

    /** An array of Tile objects which are rendered within the objects container */
    get tiles(): TObject[];

    override controllableObjects(): Generator<TObject>;

    /* -------------------------------------------- */
    /*  Layer Methods                               */
    /* -------------------------------------------- */

    override getSnappedPoint(point: Point): Point;

    protected override _tearDown(options?: object): Promise<void>;

    static override prepareSceneControls(): SceneControl;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftDrop(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftCancel(event: PlaceablesLayerPointerEvent<TObject>): void;

    /**
     * Handle drop events for Tile data on the Tiles Layer
     * @param event  The concluding drag event
     * @param data   The extracted Tile data
     */
    protected _onDropData(event: DragEvent, data: object): Promise<TObject>;

    /**
     * Prepare the data object when a new Tile is dropped onto the canvas
     * @param event  The concluding drag event
     * @param data   The extracted Tile data
     * @returns  The prepared data to create
     */
    _getDropData(event: DragEvent, data: object): object;
}
