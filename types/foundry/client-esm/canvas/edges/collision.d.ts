import type { Edge } from "./edge.d.ts";
import type { PolygonVertex } from "./vertex.d.ts";

/**
 * A specialized object that contains the result of a collision in the context of the ClockwiseSweepPolygon.
 * This class is not designed or intended for use outside of that context.
 */
export class CollisionResult {
    constructor(options?: CollisionResultOptions);

    /** The vertex that was the target of this result */
    target: PolygonVertex;

    /** The array of collision points which apply to this result */
    collisions: PolygonVertex[];

    /** The set of edges connected to the target vertex that continue clockwise */
    cwEdges: Set<Edge>;

    /** The set of edges connected to the target vertex that continue counter-clockwise */
    ccwEdges: Set<Edge>;

    /** Is the target vertex for this result behind some closer active edge? */
    isBehind: boolean;

    /** Does the target vertex for this result impose a limited collision? */
    isLimited: boolean;

    /** Has the set of collisions for this result encountered a limited edge? */
    wasLimited: boolean;

    /** Is this result limited in the clockwise direction? */
    limitedCW: boolean;

    /** Is this result limited in the counter-clockwise direction? */
    limitedCCW: boolean;

    /** Is this result blocking in the clockwise direction? */
    blockedCW: boolean;

    /** Is this result blocking in the counter-clockwise direction? */
    blockedCCW: boolean;

    /** Previously blocking in the clockwise direction? */
    blockedCWPrev: boolean;

    /** Previously blocking in the counter-clockwise direction? */
    blockedCCWPrev: boolean;
}

interface CollisionResultOptions {
    target?: PolygonVertex[];
    collisions?: PolygonVertex[];
    cwEdges?: Set<Edge>;
    ccwEdges?: Set<Edge>;
    isBehind?: boolean;
    isLimited?: boolean;
    wasLimited?: boolean;
}
