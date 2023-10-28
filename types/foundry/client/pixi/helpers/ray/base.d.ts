export {};

declare global {
    /**
     * A ray for the purposes of computing sight and collision
     * Given points A[x,y] and B[x,y]
     *
     * Slope-Intercept form:
     * y = a + bx
     * y = A.y + ((B.y - A.Y) / (B.x - A.x))x
     *
     * Parametric form:
     * R(t) = (1-t)A + tB
     */
    class Ray {
        constructor(A: Point, B: Point);

        // Store points
        A: Point;
        B: Point;

        // Origins
        y0: number;
        x0: number;

        // Slopes
        dx: number;
        dy: number;

        /** The slope of the ray, dy over dx */
        slope: number;

        /** The normalized angle of the ray in radians on the range (-PI, PI) */
        angle: number;

        /** The distance of the ray */
        distance: number;

        /**
         * Return the value of the angle normalized to the range (0, 2*PI)
         * This is useful for testing whether an angle falls between two others
         */
        readonly normAngle: number;

        static fromAngle(x: number, y: number, radians: number, distance: number): Ray;

        static fromArrays(A: [], B: []): Ray;

        /**
         * Project the Array by some proportion of it's initial distance.
         * Return the coordinates of that point along the path.
         * @param t The distance along the Ray
         * @return The coordinates of the projected point
         */
        project(t: number): Point;

        shiftAngle(angleOffset: number, distance: number): Ray;

        /**
         * Find the point I[x,y] and distance t* on ray R(t) which intersects another ray
         * http://paulbourke.net/geometry/pointlineplane/
         */
        intersectSegment(coords: [number]): Vector2;

        static _getIntersection(
            x1: number,
            y1: number,
            x2: number,
            y2: number,
            x3: number,
            y3: number,
            x4: number,
            y4: number,
        ): Vector2;
    }
}
