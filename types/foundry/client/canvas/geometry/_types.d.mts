import { PointEffectSource } from "../sources/point-effect-source.mjs";
import { Ray } from "./_module.mjs";
import { CollisionResult } from "./edges/collision.mjs";
import Edge from "./edges/edge.mjs";
import PolygonVertex from "./edges/vertex.mjs";
import Quadtree from "./quad-tree.mjs";

export interface ClipperPoint {
    X: number;
    Y: number;
}

export type PointSourcePolygonType = "light" | "darkness" | "sight" | "sound" | "move" | "universal";

export interface PointSourcePolygonConfig {
    /** The type of polygon being computed */
    type: PointSourcePolygonType;
    /** The angle of emission, if limited */
    angle?: number;
    /** The desired density of padding rays, a number per PI */
    density?: number;
    /** A limited radius of the resulting polygon */
    radius?: number;
    /** The direction of facing, required if the angle is limited */
    rotation?: number;
    /** Customize how wall direction of one-way walls is applied */
    wallDirectionMode?: number;
    /** Compute the polygon with threshold wall constraints applied */
    useThreshold?: boolean;
    /** Display debugging visualization and logging for the polygon */
    debug?: boolean;
    /** The object (if any) that spawned this polygon. */
    source?: PointEffectSource;
    /** Limiting polygon boundary shapes */
    boundaryShapes?: (PIXI.Rectangle | PIXI.Circle | PIXI.Polygon)[];
    /** Does this polygon have a limited radius? */
    hasLimitedRadius?: boolean;
    /** Does this polygon have a limited angle? */
    hasLimitedAngle?: boolean;
    /** The computed bounding box for the polygon */
    boundingBox?: PIXI.Rectangle;
}

type EdgeType = "wall" | "darkness" | "light" | "innerBounds" | "outerBounds";

/**
 * @example
 * How modes are working:
 * - 0=no     : The edges of this type are rejected and not processed (equivalent of not having an edgeType.)
 * - 1=maybe  : The edges are processed and tested for inclusion.
 * - 2=always : The edges are automatically included.
 */

interface ClockwiseSweepPolygonConfig extends PointSourcePolygonConfig {
    /**
     * Optional priority when it comes to ignore edges from darkness and light sources
     * @default 0
     */
    priority?: number;
    /**
     * Edge types configuration object. This is not required by most polygons and will be inferred based on the polygon
     * type and priority.
     */
    edgeTypes?: Record<EdgeType, { priority: number; mode: 0 | 1 | 2 }>;
}

interface RayIntersection {
    /** The x-coordinate of intersection */
    x: number;
    /** The y-coordinate of intersection */
    y: number;
    /** The proximity to the Ray origin, as a ratio of distance */
    t0: number;
    /** The proximity to the Ray destination, as a ratio of distance */
    t1: number;
}

interface QuadtreeObject {
    r: PIXI.Rectangle;
    t: unknown;
    n?: Set<Quadtree<object>>;
}

type VertexMap = Map<number, PolygonVertex>;

type EdgeSet = Set<Edge>;

interface PolygonRay extends Ray {
    result: CollisionResult;
}
