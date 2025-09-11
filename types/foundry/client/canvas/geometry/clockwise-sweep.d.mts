import { Point } from "@common/_types.mjs";
import { ClockwiseSweepPolygonConfig, EdgeType, PolygonRay } from "./_types.mjs";
import { Edge, PolygonVertex } from "./edges/_module.mjs";
import Ray from "./shapes/ray.mjs";
import PointSourcePolygon from "./shapes/source-polygon.mjs";

/**
 * A PointSourcePolygon implementation that uses CCW (counter-clockwise) geometry orientation.
 * Sweep around the origin, accumulating collision points based on the set of active walls.
 * This algorithm was created with valuable contributions from https://github.com/caewok
 */
declare class ClockwiseSweepPolygon extends PointSourcePolygon<ClockwiseSweepPolygonConfig> {
    /**
     * A mapping of vertices which define potential collision points
     */
    vertices: Map<string, PolygonVertex>;

    /**
     * The set of edges which define potential boundaries of the polygon
     */
    edges: Set<Edge>;

    /**
     * A collection of rays which are fired at vertices
     */
    rays: PolygonRay[];

    /* -------------------------------------------- */
    /*  Getters/Setters                             */
    /* -------------------------------------------- */

    /**
     * Is this polygon using inner bounds?
     */
    get useInnerBounds(): boolean;

    /* -------------------------------------------- */
    /*  Initialization                              */
    /* -------------------------------------------- */

    override initialize(origin: Point, config: ClockwiseSweepPolygonConfig): void;

    /**
     * Determine the edge types and their manner of inclusion for this polygon instance.
     * @param {string} type
     * @param {number} priority
     * @param {object} [config={}]           Optional polygon config which may include deprecated properties
     * @returns {Record<EdgeType, {priority: number, mode: 0|1|2}>}
     */
    protected _determineEdgeTypes(
        type: string,
        priority: number,
        config?: object,
    ): Record<EdgeType, { priority: number; mode: 0 | 1 | 2 }>;

    override clone(): this;

    /* -------------------------------------------- */
    /*  Computation                                 */
    /* -------------------------------------------- */

    protected override _compute(): void;

    /* -------------------------------------------- */
    /*  Edge Configuration                          */
    /* -------------------------------------------- */

    /**
     * Retrieves the super-set of walls that could potentially apply to this polygon.
     * Utilizes a custom collision test and the Quadtree to obtain candidate edges efficiently.
     * @protected
     */
    protected _identifyEdges(): void;

    /**
     * Test whether a wall should be included in the computed polygon for a given origin and type
     * @param edge      The Edge being considered
     * @param edgeTypes Which types of edges are being used? 0=no, 1=maybe, 2=always
     * @returns Should the edge be included?
     */
    protected _testEdgeInclusion(
        edge: Edge,
        edgeTypes: Record<EdgeType, { priority: number; mode: 0 | 1 | 2 }>,
    ): boolean;

    /**
     * Compute the aggregate bounding box which is the intersection of all boundary shapes.
     * Round and pad the resulting rectangle by 1 pixel to ensure it always contains the origin.
     */
    protected _defineBoundingBox(): PIXI.Rectangle;

    /* -------------------------------------------- */
    /*  Vertex Identification                       */
    /* -------------------------------------------- */

    /**
     * Consolidate all vertices from identified edges and register them as part of the vertex mapping.
     */
    protected _identifyVertices(): void;

    /**
     * Add additional vertices for intersections between edges.
     */
    protected _identifyIntersections(edgeMap: Map<string, Edge>): void;

    /* -------------------------------------------- */
    /*  Radial Sweep                                */
    /* -------------------------------------------- */

    /* -------------------------------------------- */
    /*  Collision Testing                           */
    /* -------------------------------------------- */

    protected override _testCollision(ray: Ray, mode: string): boolean | PolygonVertex | PolygonVertex[] | null;

    /* -------------------------------------------- */
    /*  Visualization                               */
    /* -------------------------------------------- */

    override visualize(): void;

    /**
     * This function has been adapted from Clipper's CleanPolygon function.
     * When adding a new point to the polygon, check for collinearity with prior points to cull unnecessary points.
     * This also removes spikes where we traverse points (a, b, a).
     * We also enforce a minimum distance between two points, or a minimum perpendicular distance between three almost
     * collinear points.
     */
    addPoint({ x, y }: Point): this;
}

declare namespace ClockwiseSweepPolygon {
    function create<T extends PointSourcePolygon>(
        this: ConstructorOf<T>,
        origin: Point,
        config?: ClockwiseSweepPolygonConfig,
    ): T;
}

export default ClockwiseSweepPolygon;
