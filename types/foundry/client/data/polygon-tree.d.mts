import { ClipperPoint } from "@client/canvas/geometry/_module.mjs";
import { Point } from "@common/_types.mjs";

/**
 * The node of a {@link foundry.data.PolygonTree}.
 */
export class PolygonTreeNode {
    /**
     * Create a PolygonTreeNode.
     * @param parent The parent node.
     * @internal
     */
    constructor(parent: PolygonTreeNode | null);

    /**
     * Create a node from the Clipper path and add it to the children of the parent.
     * @param clipperPath The clipper path of this node.
     * @param parent The parent node or `null` if root.
     * @internal
     */
    static _fromClipperPath(clipperPath: ClipperPoint[], parent: PolygonTreeNode | null): PolygonTreeNode;

    /**
     * The parent of this node or `null` if this is the root node.
     */
    get parent(): PolygonTreeNode | null;

    /**
     * The children of this node. The value of this property must not be mutated.
     */
    get children(): readonly PolygonTreeNode[];

    /**
     * The depth of this node. The depth of the root node is 0.
     */
    get depth(): number;

    /**
     * Is this a hole? The root node is a hole.
     */
    get isHole(): boolean;

    /**
     * Is the (sub)tree empty?
     */
    get isEmpty(): boolean;

    /**
     * The Clipper path of this node.
     * It is empty in case of the root node.
     *
     * The value of this property must not be mutated.
     */
    get clipperPath(): readonly ClipperPoint[] | null;

    /**
     * The polygon of this node. It is `null` in case of the root node. The value of this property must not be mutated.
     */
    get polygon(): PIXI.Polygon | null;

    /**
     * The points of the polygon ([x0, y0, x1, y1, ...]). They are `null` in case of the root node. The value of this
     * property must not be mutated.
     */
    get points(): readonly number[] | null;

    /**
     * The path of the polygon ([{x: x0, y: y0}, {x: x1, y: y1}, ...]).
     * They are `null` in case of the root node.
     *
     * The value of this property must not be mutated.
     */
    get path(): readonly Point[] | null;

    /**
     * The bounds of the polygon, or the combined bounds of all children in case of the root node. The value of this
     * property must not be mutated.
     */
    get bounds(): PIXI.Rectangle;

    /**
     * The area of this node.
     */
    get area(): number;

    /**
     * Iterate over recursively over the children in depth-first order.
     */
    [Symbol.iterator](): Generator<PolygonTreeNode>;

    /**
     * Find the node in this (sub)tree that contains the given point.
     * @param point The point.
     * @returns The (sub)node that contains the point, if any. Cannot return null for {@link PolygonTree}; instead the
     *          root node (the tree itself) is returned.
     */
    findContainingNode(point: Point): PolygonTreeNode | null;

    /**
     * Test whether given point is contained within this (sub)tree.
     * If `distance` is is nonzero, true is returned if and only if the signed distance from the point to the boundary of
     * the (sub)tree is less than or equal to `distance`. The signed distance is positive for points in the exterior of
     * the (sub)tree and negative for points within the interior of the (sub)tree.
     * @param point The point.
     * @param distance The tolerance of the containment test.
     * @example Test whether the point (x, y) is contained within the polygon tree
     * ```js
     * polygonTree.testPoint({x, y}, r);
     * ```
     * @example Test whether the circle at (x, y) with radius r (positive) intersects the polygon tree
     * ```js
     * polygonTree.testPoint({x, y}, r);
     * ```
     * @example Test whether the circle at (x, y) with radius r (positive) is contained within the polygon tree
     * ```js
     * polygonTree.testPoint({x, y}, -r);
     * ```
     */
    testPoint(point: Point, distance?: number): boolean;

    /**
     * Test circle containment/intersection with this (sub)tree.
     * @param center The center point of the circle.
     * @param radius The radius of the circle.
     * @returns - -1: the circle is in the exterior and does not intersect the boundary.
     *          - 0: the circle is intersects the boundary.
     *          - 1: the circle is in the interior and does not intersect the boundary.
     */
    testCircle(center: Point, radius: number): -1 | 0 | 1;

    /**
     * Find a point inside this polygon tree that is closest to the given reference point.
     * @param point The reference point.
     * @returns The closest point to the reference point in the polygon tree.
     */
    findClosestPoint(point: Point): Point;
}

/**
 * A polygon tree.
 */
export class PolygonTree extends PolygonTreeNode {
    /**
     * Create a PolygonTree.
     */
    constructor();

    /**
     * Create the tree from a Clipper polygon tree.
     */
    static fromClipperPolyTree(clipperPolyTree: ClipperLib.PolyTree): PolygonTree;

    /**
     * The polygons of this polygon tree. The value of this property must not be mutated.
     */
    get polygons(): readonly PIXI.Polygon[];

    /**
     * The Clipper paths of this polygon tree. The value of this property must not be mutated.
     */
    get clipperPaths(): DeepReadonly<ClipperPoint[][]>;

    /**
     * The triangulation of this polygon tree.
     *
     * The value of this property must not be mutated.
     */
    get triangulation(): Readonly<{ vertices: Float32Array; indices: Uint16Array | Uint32Array }>;

    /**
     * Draw the polygon tree into the Graphics element.
     * @param graphics The Graphics element.
     */
    drawShape(graphics: PIXI.Graphics): void;

    /**
     * Compute the intersection of the polygon tree with the given polygon.
     * @param polygon The polygon to intersect the polygon tree with.
     * @param options Additional options.
     * @param options.clipType The Clipper clip type. Default: `ClipperLib.ClipType.ctIntersection`.
     * @param options.fillType The Clipper fill type used for the polygon.
     *                         Default: `ClipperLib.PolyFillType.pftEvenOdd`.
     * @returns The result of the intersection.
     */
    intersectPolygon(polygon: PIXI.Polygon, options: { clipType?: number; fillType?: number }): PolygonTree;

    /**
     * Compute the intersection of the polygon tree with the given Clipper path.
     * @param path The Clipper path to intersect the polygon tree with (the scaling factor must be
     *             {@link CONST.CLIPPER_SCALING_FACTOR}).
     * @param options Additional options.
     * @param options.clipType The Clipper clip type. Default: `ClipperLib.ClipType.ctIntersection`.
     * @param options.fillType The Clipper fill type used for the Clipper path.
     *                         Default: `ClipperLib.PolyFillType.pftEvenOdd`.
     * @returns The result of the intersection.
     */
    intersectClipper(path: ClipperPoint[], options?: { clipType?: number; fillType?: number }): PolygonTree;

    /* -------------------------------------------- */
    /*  Sampling API                                */
    /* -------------------------------------------- */

    /**
     * Sample a point from the polygon tree interior.
     * @param out A point to write to.
     * @returns The sampled point.
     * @throws {Error} If the polygon tree interior is empty.
     */
    sampleInterior(out?: Point): Point;

    /**
     * Sample a point from the polygon tree boundary.
     * @param out A point to write to.
     * @returns The sampled point.
     * @throws {Error} If the polygon tree boundary is empty.
     */
    sampleBoundary(out: Point): Point;
}
