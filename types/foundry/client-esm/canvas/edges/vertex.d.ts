import type { Edge } from "./edge.d.ts";

/**
 * A specialized point data structure used to represent vertices in the context of the ClockwiseSweepPolygon.
 * This class is not designed or intended for use outside of that context.
 */
export class PolygonVertex {
    constructor(x: number, y: number, options?: PolygonVertexOptions);

    /**
     * Determine the sort key to use for this vertex, arranging points from north-west to south-east.
     * @param   x    The x-coordinate
     * @param   y    The y-coordinate
     * @returns      The key used to identify the vertex
     */
    static getKey(x: number, y: number): number;

    /**
     * The set of edges which connect to this vertex.
     * This set is initially empty and populated later after vertices are de-duplicated.
     */
    edges: Set<Edge>;

    /** The subset of edges which continue clockwise from this vertex. */
    cwEdges: Set<Edge>;

    /** The subset of edges which continue counter-clockwise from this vertex. */
    ccwEdges: Set<Edge>;

    /** The set of vertices collinear to this vertex */
    collinearVertices: Set<PolygonVertex>;

    /** Is this vertex an endpoint of one or more edges? */
    isEndpoint: boolean;

    /** Does this vertex have a single counterclockwise limiting edge? */
    isLimitingCCW: boolean;

    /** Does this vertex have a single clockwise limiting edge? */
    isLimitingCW: boolean;

    /** Does this vertex have non-limited edges or 2+ limited edges counterclockwise? */
    isBlockingCCW: boolean;

    /** Does this vertex have non-limited edges or 2+ limited edges clockwise? */
    isBlockingCW: boolean;

    /** Does this vertex result from an internal collision? */
    isInternal: boolean;

    /** The maximum restriction imposed by this vertex. */
    restriction: number;

    /** Is this vertex limited in type? */
    get isLimited(): boolean;

    /**
     * Associate an edge with this vertex.
     * @param edge           The edge being attached
     * @param orientation    The orientation of the edge with respect to the origin
     * @param type           The restriction type of polygon being created
     */
    attachEdge(edge: Edge, orientation: number, type: string): void;

    /**
     * Is this vertex the same point as some other vertex?
     * @param   other   Some other vertex
     * @returns         Are they the same point?
     */
    equals(other: PolygonVertex): boolean;

    /**
     * Construct a PolygonVertex instance from some other Point structure.
     * @param    point      The point
     * @param    [options]  Additional options that apply to this vertex
     * @returns             The constructed vertex
     */
    static fromPoint(point: Point, options: PolygonVertexOptions): PolygonVertex;
}

interface PolygonVertexOptions {
    distance?: number;
    index?: number;
}
