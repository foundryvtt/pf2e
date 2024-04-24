import type { Edge, EdgeTypes, PolygonVertex } from "../../../client-esm/canvas/edges/module.d.ts";

declare global {
    /**
     * A PointSourcePolygon implementation that uses CCW (counter-clockwise) geometry orientation.
     * Sweep around the origin, accumulating collision points based on the set of active walls.
     * This algorithm was created with valuable contributions from https://github.com/caewok
     */
    class ClockwiseSweepPolygon extends PointSourcePolygon {
        /** A mapping of vertices which define potential collision points */
        vertices: Map<number, PolygonVertex>;

        /** The set of edges which define potential boundaries of the polygon */
        edges: Set<Edge>;

        /** A collection of rays which are fired at vertices */
        rays: Ray[];

        /* -------------------------------------------- */
        /*  Initialization                              */
        /* -------------------------------------------- */

        override initialize(origin: Point, config: PointSourcePolygonConfig): void;

        /* -------------------------------------------- */
        /*  Computation                                 */
        /* -------------------------------------------- */

        protected override _compute(): void;

        /* -------------------------------------------- */
        /*  Edge Configuration                          */
        /* -------------------------------------------- */

        /**
         * Get the super-set of walls which could potentially apply to this polygon.
         * Define a custom collision test used by the Quadtree to obtain candidate Walls.
         */
        protected _identifyEdges(): void;

        /**
         * Test whether a wall should be included in the computed polygon for a given origin and type
         * @param    edge           The Edge being considered
         * @param    edgeTypes      Which types of edges are being used? 0=no, 1=maybe, 2=always
         * @param    bounds         The overall bounding box
         * @returns                 Should the edge be included?
         */
        protected _testEdgeInclusion(
            edge: Edge,
            edgeTypes: Record<EdgeTypes, 0 | 1 | 2>,
            bounds: PIXI.Rectangle,
        ): boolean;

        /**
         * Compute the aggregate bounding box which is the intersection of all boundary shapes.
         * Round and pad the resulting rectangle by 1 pixel to ensure it always contains the origin.
         */
        protected _defineBoundingBox(): PIXI.Rectangle;

        /* -------------------------------------------- */
        /*  Vertex Identification                       */
        /* -------------------------------------------- */

        /** Consolidate all vertices from identified edges and register them as part of the vertex mapping. */
        protected _identifyVertices(): void;

        /**
         * Add additional vertices for intersections between edges.
         * @param    edgeMap
         */
        protected _identifyIntersections(edgeMap: Map<string, Edge>): void;

        /* -------------------------------------------- */
        /*  Collision Testing                           */
        /* -------------------------------------------- */

        /**
         * Determine the set of collisions which occurs for a Ray.
         * @param ray    The Ray to test
         * @param mode   The collision mode being tested
         * @returns      The collision test result
         */
        protected override _testCollision(ray: Ray, mode: string): boolean | PolygonVertex | PolygonVertex[] | null;
    }
}
