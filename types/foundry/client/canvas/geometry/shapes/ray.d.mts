import { Point } from "@common/_types.mjs";

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
export default class Ray {
    constructor(A: Point, B: Point);

    /**
     * The origin point, {x, y}
     */
    A: Point;

    /**
     * The destination point, {x, y}
     */
    B: Point;

    /**
     * The origin y-coordinate
     */
    y0: number;

    /**
     * The origin x-coordinate
     */
    x0: number;

    /**
     * The horizontal distance of the ray, x1 - x0
     */
    dx: number;

    /**
     * The vertical distance of the ray, y1 - y0
     */
    dy: number;

    /**
     * The slope of the ray, dy over dx
     */
    slope: number;

    /* -------------------------------------------- */
    /*  Attributes                                  */
    /* -------------------------------------------- */

    /**
     * The normalized angle of the ray in radians on the range (-PI, PI).
     * The angle is computed lazily (only if required) and cached.
     */
    get angle(): number;

    set angle(value: number);

    /**
     * A normalized bounding rectangle that encompasses the Ray
     */
    get bounds(): PIXI.Rectangle;

    /**
     * The distance (length) of the Ray in pixels.
     * The distance is computed lazily (only if required) and cached.
     */
    get distance(): number;

    set distance(value: number);

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * A factory method to construct a Ray from an origin point, an angle, and a distance
     * @param x The origin x-coordinate
     * @param y The origin y-coordinate
     * @param radians The ray angle in radians
     * @param distance The distance of the ray in pixels
     * @returns The constructed Ray instance
     */
    static fromAngle(x: number, y: number, radians: number, distance: number): Ray;

    /**
     * A factory method to construct a Ray from points in array format.
     * @param A The origin point [x,y]
     * @param B The destination point [x,y]
     * @returns The constructed Ray instance
     */
    static fromArrays(A: [number, number], B: [number, number]): Ray;

    /**
     * Project the Array by some proportion of it's initial distance.
     * Return the coordinates of that point along the path.
     * @param t The distance along the Ray
     * @return The coordinates of the projected point
     */
    project(t: number): Point;

    /**
     * Create a Ray by projecting a certain distance towards a known point.
     * @param origin The origin of the Ray
     * @param point The point towards which to project
     * @param distance The distance of projection
     */
    static towardsPoint(origin: Point, point: Point, distance: number): Ray;

    /**
     * Create a Ray by projecting a certain squared-distance towards a known point.
     * @param origin The origin of the Ray
     * @param point The point towards which to project
     * @param distance2 The squared distance of projection
     */
    static towardsPointSquared(origin: Point, point: Point, distance2: number): Ray;

    /**
     * Reverse the direction of the Ray, returning a second Ray
     */
    reverse(): Ray;

    /**
     * Create a new ray which uses the same origin point, but a slightly offset angle and distance
     * @param offset An offset in radians which modifies the angle of the original Ray
     * @param distance A distance the new ray should project, otherwise uses the same distance.
     * @return A new Ray with an offset angle
     */
    shiftAngle(angleOffset: number, distance?: number): Ray;

    /**
     * Find the point I[x,y] and distance t* on ray R(t) which intersects another ray
     * http://paulbourke.net/geometry/pointlineplane/
     */
    intersectSegment(coords: [number]): Vector2;
}
