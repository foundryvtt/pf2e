import PlaceableObject from "@client/canvas/placeables/placeable-object.mjs";
import { Point } from "@common/_types.mjs";
import { WallSenseType } from "@common/constants.mjs";
import PolygonVertex from "./vertex.mjs";

/**
 * A data structure used to represent potential edges used by the ClockwiseSweepPolygon.
 * Edges are not polygon-specific, meaning they can be reused across many polygon instances.
 */
export default class Edge {
    /**
     * Construct an Edge by providing the following information.
     * @param {Point} a                     The first endpoint of the edge
     * @param {Point} b                     The second endpoint of the edge
     * @param {object} [options]            Additional options which describe the edge
     * @param {string} [options.id]               A string used to uniquely identify this edge
     * @param {PlaceableObject} [options.object]  A PlaceableObject that is responsible for this edge, if any
     * @param {EdgeTypes} [options.type]          The type of edge
     * @param {WALL_SENSE_TYPES} [options.light]  How this edge restricts light
     * @param {WALL_SENSE_TYPES} [options.move]   How this edge restricts movement
     * @param {WALL_SENSE_TYPES} [options.sight]  How this edge restricts sight
     * @param {WALL_SENSE_TYPES} [options.sound]  How this edge restricts sound
     */
    constructor(a: Point, b: Point, options?: EdgeOptions);

    /** The first endpoint of the edge. */
    a: PIXI.Point;

    /** The second endpoint of the edge. */
    b: PIXI.Point;

    /** The endpoint of the edge which is oriented towards the top-left. */
    nw: PIXI.Point;

    /** The endpoint of the edge which is oriented towards the bottom-right. */
    se: PIXI.Point;

    /** The rectangular bounds of the edge. Used by the quadtree. */
    bounds: PIXI.Rectangle;

    /** The direction of effect for the edge */
    direction: number;

    /** A string used to uniquely identify this edge. */
    id?: string;

    /** How this edge restricts light. */
    light: WallSenseType;

    /** How this edge restricts movement. */
    move: WallSenseType;

    /** How this edge restricts sight. */
    sight: WallSenseType;

    /** How this edge restricts sound. */
    sound: WallSenseType;

    /** Specialized threshold data for this edge. */
    threshold?: unknown;

    /** Record other edges which this one intersects with. */
    intersections: { edge: Edge; intersection: LineIntersection }[];

    /**
     * A PolygonVertex instance.
     * Used as part of ClockwiseSweepPolygon computation.
     */
    vertexA: PolygonVertex;

    /**
     * A PolygonVertex instance.
     * Used as part of ClockwiseSweepPolygon computation.
     */
    vertexB: PolygonVertex;

    /** Is this edge limited for a particular type? */
    isLimited(type: "light" | "move" | "sense" | "sound"): boolean;

    /** Create a copy of the Edge which can be safely mutated. */
    clone(): Edge;

    /** Get an intersection point between this Edge and another. */
    getIntersection(other: Edge): LineIntersection | void;

    /**
     * Test whether to apply a proximity threshold to this edge.
     * If the proximity threshold is met, this edge excluded from perception calculations.
     * @param sourceType     Sense type for the source
     * @param sourceOrigin    The origin or position of the source on the canvas
     * @param [externalRadius=0] The external radius of the source
     * @returns              True if the edge has a threshold greater than 0 for the source type,
     *                       and the source type is within that distance.
     */
    applyThreshold(sourceType: string, sourceOrigin: Point, externalRadius?: number): boolean;

    /**
     * Determine the orientation of this Edge with respect to a reference point.
     * @param    point       Some reference point, relative to which orientation is determined
     * @returns              An orientation in CONST.WALL_DIRECTIONS which indicates whether the Point is left,
     *                       right, or collinear (both) with the Edge
     */
    orientPoint(point: Point): number;

    /* -------------------------------------------- */
    /*  Intersection Management                     */
    /* -------------------------------------------- */

    /**
     * Identify intersections between a provided iterable of edges.
     * @param {Iterable<Edge>} edges    An iterable of edges
     */
    static identifyEdgeIntersections(edges: Iterable<Edge>): void;

    /**
     * Record the intersections between two edges.
     * @param other          Another edge to test and record
     */
    recordIntersections(other: Edge): void;

    /** Remove intersections of this edge with all other edges. */
    removeIntersections(): void;
}

interface EdgeOptions {
    id?: string;
    object?: PlaceableObject;
    type?: EdgeTypes;
    /** How this edge restricts light */
    light?: WallSenseType;
    /** How this edge restricts movement */
    move?: WallSenseType;
    /** How this edge restricts sight */
    sight?: WallSenseType;
    /** How this edge restricts sound */
    sound?: WallSenseType;
    /** A direction of effect for the edge */
    direction?: number;
    /** Configuration of threshold data for this edge */
    threshold?: unknown;
}

type EdgeTypes = "wall" | "darkness" | "innerBounds" | "outerBounds";
