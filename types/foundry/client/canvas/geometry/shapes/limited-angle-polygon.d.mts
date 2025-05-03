import { Point } from "@common/_types.mjs";
import { PolygonRay } from "../_types.mjs";

/**
 * A special class of Polygon which implements a limited angle of emission for a Point Source.
 * The shape is defined by a point origin, radius, angle, and rotation.
 * The shape is further customized by a configurable density which informs the approximation.
 * An optional secondary externalRadius can be provided which adds supplementary visibility outside the primary angle.
 */
export default class LimitedAnglePolygon extends PIXI.Polygon {
    constructor(
        origin: Point,
        options?: { radius?: number; angle?: number; rotation?: number; density?: number; externalRadius?: number },
    );

    /**
     * The origin point of the Polygon
     */
    origin: Point;

    /**
     * The radius of the emitted cone.
     */
    radius: number;

    /**
     * The angle of the Polygon in degrees.
     */
    angle: number;

    /**
     * The direction of rotation at the center of the emitted angle in degrees.
     */
    rotation: number;

    /**
     * The density of rays which approximate the cone, defined as rays per PI.
     */
    density: number;

    /**
     * An optional "external radius" which is included in the polygon for the supplementary area outside the cone.
     */
    externalRadius: number;

    /**
     * The angle of the left (counter-clockwise) edge of the emitted cone in radians.
     */
    aMin: number;

    /**
     * The angle of the right (clockwise) edge of the emitted cone in radians.
     */
    aMax: number;

    /**
     * The bounding box of the circle defined by the externalRadius, if any
     */
    externalBounds: PIXI.Rectangle;

    /**
     * Test whether a vertex lies between two boundary rays.
     * If the angle is greater than 180, test for points between rMax and rMin (inverse).
     * Otherwise, keep vertices that are between the rays directly.
     * @param point The candidate point
     * @param rMin  The counter-clockwise bounding ray
     * @param rMax  The clockwise bounding ray
     * @param angle The angle being tested, in degrees
     * @returns Is the vertex between the two rays?
     */
    static pointBetweenRays(point: Point, rMin: PolygonRay, rMax: PolygonRay, angle: number): boolean;
}
