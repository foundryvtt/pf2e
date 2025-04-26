import { Point, PointArray } from "@common/_types.mjs";
import { SceneControl } from "../../applications/ui/scene-controls.mjs";
import Wall from "../placeables/wall.mjs";
import { PlaceablesLayerOptions } from "./_types.mjs";
import PlaceablesLayer, { PlaceablesLayerPointerEvent } from "./base/placeables-layer.mjs";

/**
 * The Walls canvas layer which provides a container for Wall objects within the rendered Scene.
 * @category Canvas
 */
export default class WallsLayer<TObject extends Wall = Wall> extends PlaceablesLayer<TObject> {
    /** A graphics layer used to display chained Wall selection */
    chain: PIXI.Graphics | null;

    /**
     * Track whether we are currently within a chained placement workflow
     * @internal
     */
    _chain: boolean;

    /**
     * Track the most recently created or updated wall data for use with the clone tool
     * @internal
     */
    _cloneType: object | null;

    /**
     * Reference the last interacted wall endpoint for the purposes of chaining
     * @internal
     */
    _last: { point: PointArray };

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    static override get layerOptions(): PlaceablesLayerOptions;

    static override documentName: "Wall";

    override get hookName(): string;

    /** An Array of Wall instances in the current Scene which act as Doors. */
    get doors(): TObject[];

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override getSnappedPoint(point: Point): Point;

    protected override _draw(options?: object): Promise<void>;

    protected override _deactivate(): void;

    /**
     * Given a point and the coordinates of a wall, determine which endpoint is closer to the point
     * @param point  The origin point of the new Wall placement
     * @param wall   The existing Wall object being chained to
     * @returns  The [x,y] coordinates of the starting endpoint
     */
    static getClosestEndpoint(point: Point, wall: Wall): PointArray;

    override releaseAll(options?: object): number;

    /**
     * Get the wall endpoint coordinates for a given point.
     * @param point                The candidate wall endpoint.
     * @param [options]
     * @param [options.snap=true]  Snap to the grid?
     * @returns  The wall endpoint coordinates.
     * @internal
     */
    _getWallEndpointCoordinates(point: Point, options?: { snap?: boolean }): PointArray;

    /**
     * Identify the interior enclosed by the given walls.
     * @param walls  The walls that enclose the interior.
     * @returns The polygons of the interior.
     * @license MIT
     */
    identifyInteriorArea(walls: TObject[]): PIXI.Polygon[];

    static override prepareSceneControls(): SceneControl;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftDrop(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftCancel(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onClickRight(event: PlaceablesLayerPointerEvent<TObject>): void;
}
