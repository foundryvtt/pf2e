import { EdgeDirectionMode } from "@common/constants.mjs";
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
    /** Customize how edge direction of one-way edges is applied */
    edgeDirectionMode?: EdgeDirectionMode;
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
 *   Modes:
 *    - Never (`0`): The edges of this type are never included.
 *    - Maybe (`1`): The edges of this type are tested for inclusion.
 *    - Always (`2`): The edges of this type are always included.
 */
interface ClockwiseSweepEdgeConfig {
    mode: 0 | 1 | 2;
    priority: number;
}

interface ClockwiseSweepPolygonConfig extends PointSourcePolygonConfig {
    /**
     * Edges with priority less than this priority are ignored
     * @default 0
     */
    priority?: number;
    /**
     * Edge types configured as `false` is equivalent to those edges never being included.
     * Edge types configured as `true` are included conditionally depending on the type of polygon and the type of edge.
     */
    edgeTypes?: Record<EdgeType, boolean | Partial<ClockwiseSweepEdgeConfig>>;
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
