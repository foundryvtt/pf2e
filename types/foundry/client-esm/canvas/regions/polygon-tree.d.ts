import * as ClipperLib from "js-angusj-clipper";

/** The node of a {@link RegionPolygonTree}. */
declare class RegionPolygonTreeNode {
    /**
     * Create a RegionPolygonTreeNode.
     * @param    parent    The parent node.
     * @internal
     */
    constructor(parent: RegionPolygonTreeNode | null);

    /**
     * Create a node from the Clipper path and add it to the children of the parent.
     * @param    clipperPath  The clipper path of this node.
     * @param    parent       The parent node or `null` if root.
     * @internal
     */
    static _fromClipperPath(
        clipperPath: ClipperLib.IntPoint[],
        parent: RegionPolygonTreeNode | null,
    ): RegionPolygonTreeNode;

    /** The parent of this node or `null` if this is the root node. */
    get parent(): RegionPolygonTreeNode | null;

    /** The children of this node. */
    get children(): readonly RegionPolygonTreeNode[];

    /**
     * The depth of this node.
     * The depth of the root node is 0.
     */
    get depth(): number;

    /**
     * Is this a hole?
     * The root node is a hole.
     */
    get isHole(): boolean;

    /**
     * The Clipper path of this node.
     * It is empty in case of the root node.
     */
    get clipperPath(): readonly ClipperLib.IntPoint[] | null;

    /**
     * The polygon of this node.
     * It is `null` in case of the root node.
     */
    get polygon(): PIXI.Polygon | null;

    /**
     * The points of the polygon ([x0, y0, x1, y1, ...]).
     * They are `null` in case of the root node.
     */
    get points(): readonly number[] | null;

    /**
     * The bounds of the polygon.
     * They are `null` in case of the root node.
     */
    get bounds(): PIXI.Rectangle | null;

    /** Iterate over recursively over the children in depth-first order. */
    [Symbol.iterator](): Generator<RegionPolygonTreeNode>;

    /**
     * Test whether given point is contained within this node.
     * @param point    The point.
     */
    testPoint(point: Point): boolean;

    /**
     * Test circle containment/intersection with this node.
     * @param   center    The center point of the circle.
     * @param   radius    The radius of the circle.
     * @returns           - -1: the circle is in the exterior and does not intersect the boundary.
     *                    - 0: the circle is intersects the boundary.
     *                    - 1: the circle is in the interior and does not intersect the boundary.
     */
    testCircle(center: Point, radius: number): -1 | 0 | 1;
}

/* -------------------------------------------- */

/**
 * The polygon tree of a {@link Region}.
 */
declare class RegionPolygonTree extends RegionPolygonTreeNode {
    /**
     * Create a RegionPolygonTree.
     * @internal
     */
    constructor();

    /**
     * Create the tree from a Clipper polygon tree.
     * @param    clipperPolyTree
     * @internal
     */
    static _fromClipperPolyTree(clipperPolyTree: ClipperLib.PolyTree): RegionPolygonTree;
}
