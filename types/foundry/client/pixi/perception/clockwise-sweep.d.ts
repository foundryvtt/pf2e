export {};

declare global {
    /**
     * A PointSourcePolygon implementation that uses CCW (counter-clockwise) geometry orientation.
     * Sweep around the origin, accumulating collision points based on the set of active walls.
     * This algorithm was created with valuable contributions from https://github.com/caewok
     */
    class ClockwiseSweepPolygon extends PointSourcePolygon {
        protected _compute(): void;

        protected _testCollision(ray: Ray, mode: string): boolean | PolygonVertex | PolygonVertex[] | null;
    }
}
