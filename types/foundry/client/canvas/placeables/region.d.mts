import { RegionPolygonTree } from "@client/data/region-shapes/polygon-tree.mjs";
import { RegionShape } from "@client/data/region-shapes/shape.mjs";
import RegionDocument from "@client/documents/region.mjs";
import Scene from "@client/documents/scene.mjs";
import User from "@client/documents/user.mjs";
import { DatabaseUpdateCallbackOptions } from "@common/abstract/_types.mjs";
import * as ClipperLib from "js-angusj-clipper";
import { Point } from "../../../common/_types.mjs";
import PlaceableObject from "./placeable-object.mjs";
import RegionGeometry from "./regions/geometry.mjs";

/**
 * A Region is an implementation of PlaceableObject which represents a Region document
 * within a viewed Scene on the game canvas.
 * @category - Canvas
 * @see {RegionDocument}
 * @see {RegionLayer}
 */
export default class Region<
    TDocument extends RegionDocument<Scene | null> = RegionDocument<Scene | null>,
> extends PlaceableObject<TDocument> {
    static override embeddedName: "Region";

    static override RENDER_FLAGS: {
        redraw: { propagate: ["refresh"] };
        refresh: { propagate: ["refreshState", "refreshBorder"]; alias: boolean };
        refreshState: object;
        refreshBorder: object;
    };

    /** The scaling factor used for Clipper paths. */
    static CLIPPER_SCALING_FACTOR: {
        value: number;
    };

    /** The three movement segment types: ENTER, MOVE, and EXIT. */
    static readonly MOVEMENT_SEGMENT_TYPES: {
        /** The segment crosses the boundary of the region and exits it. */
        EXIT: -1;
        /** The segment does not cross the boundary of the region and is contained within it. */
        MOVE: 0;
        /** The segment crosses the boundary of the region and enters it. */
        ENTER: 1;
    };

    /** The shapes of this Region in draw order. */
    get shapes(): readonly RegionShape[];

    /** The bottom elevation of this Region. */
    get bottom(): number;

    /** The top elevation of this Region. */
    get top(): number;

    /** The polygons of this Region. */
    get polygons(): readonly PIXI.Polygon[];

    /** The polygon tree of this Region. */
    get polygonTree(): RegionPolygonTree;

    /** The Clipper paths of this Region. */
    get clipperPaths(): readonly (readonly ClipperLib.IntPoint[])[];

    /** The triangulation of this Region. */
    get triangulation(): { vertices: Float32Array; indices: Uint16Array | Uint32Array };

    /** The geometry of this Region. */
    get geometry(): RegionGeometry;

    /** Is this Region currently visible on the Canvas? */
    get isVisible(): boolean;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    override _draw(options?: object): Promise<void>;

    /* -------------------------------------------- */
    /*  Incremental Refresh                         */
    /* -------------------------------------------- */

    override _applyRenderFlags(flags: Record<string, boolean>): void;

    /** Refresh the state of the Region. */
    protected _refreshState(): void;

    /** Refresh the border of the Region. */
    protected _refreshBorder(): void;

    /** @override */
    protected override _canDrag(user: User, event: PIXI.FederatedPointerEvent): boolean;

    protected override _canHUD(user: User, event: PIXI.FederatedPointerEvent): boolean;

    protected override _onControl(options: Record<string, unknown>): void;

    protected override _onRelease(options: Record<string, unknown>): void;

    protected override _onHoverIn(
        event: PIXI.FederatedPointerEvent,
        options?: { updateLegend?: boolean; hoverOutOthers?: boolean },
    ): void;

    protected override _onHoverOut(event: PIXI.FederatedPointerEvent, options?: { updateLegend?: boolean }): void;

    protected override _overlapsSelection(rectangle: PIXI.Rectangle): boolean;

    /* -------------------------------------------- */
    /*  Document Event Handlers                     */
    /* -------------------------------------------- */

    override _onUpdate(
        changed: DeepPartial<TDocument["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    /* -------------------------------------------- */
    /*  Shape Methods                               */
    /* -------------------------------------------- */

    /**
     * Test whether the given point (at the given elevation) is inside this Region.
     * @param   point         The point.
     * @param   [elevation]   The elevation of the point.
     * @returns               Is the point (at the given elevation) inside this Region?
     */
    testPoint(point: Point, elevation?: number): boolean;

    /**
     * Split the movement into its segments.
     * @param   waypoints                  The waypoints of movement.
     * @param   samples                    The points relative to the waypoints that are tested.
     *                                     Whenever one of them is inside the region, the moved object
     *                                     is considered to be inside the region.
     * @param   [options]                  Additional options
     * @param   [options.teleport=false]   Is it teleportation?
     * @returns                            The movement split into its segments.
     */
    segmentizeMovement(
        waypoints: RegionMovementWaypoint[],
        samples: Point[],
        options?: { teleport?: boolean },
    ): RegionMovementSegment[];
}

export interface RegionMovementWaypoint {
    /** The x-coordinates in pixels (integer). */
    x: number;
    /** The y-coordinates in pixels (integer). */
    y: number;
    /** The elevation in grid units. */
    elevation: number;
}

export interface RegionMovementSegment {
    /** The type of this segment (see {@link Region.MOVEMENT_SEGMENT_TYPES}). */
    type: (typeof Region.MOVEMENT_SEGMENT_TYPES)[keyof typeof Region.MOVEMENT_SEGMENT_TYPES];
    /** The waypoint that this segment starts from. */
    from: RegionMovementWaypoint;
    /** The waypoint that this segment goes to. */
    to: RegionMovementWaypoint;
}
