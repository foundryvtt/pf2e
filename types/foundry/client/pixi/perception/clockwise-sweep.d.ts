export {};

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
        edges: Set<PolygonEdge>;

        /** A collection of rays which are fired at vertices */
        rays: Ray[];

        protected _compute(): void;

        protected _testCollision(ray: Ray, mode: string): boolean | PolygonVertex | PolygonVertex[] | null;
    }
}
