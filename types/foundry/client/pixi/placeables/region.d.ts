import * as ClipperLib from "js-angusj-clipper";

/**
 * A Region is an implementation of PlaceableObject which represents a Region document
 * within a viewed Scene on the game canvas.
 * @category - Canvas
 * @see {RegionDocument}
 * @see {RegionLayer}
 */
declare class Region<
    TDocument extends RegionDocument<Scene | null> = RegionDocument<Scene | null>,
> extends PlaceableObject<TDocument> {
    static override embeddedName: "Region";

    static override RENDER_FLAGS: {
        redraw: { propagate: ["refresh"] };
        refresh: { propagate: ["refreshState", "refreshBorder"]; alias: true };
        refreshState: {};
        refreshBorder: {};
    };

    /** The scaling factor used for Clipper paths. */
    static CLIPPER_SCALING_FACTOR: {
        value: number;
    };

    /** The three movement segment types: ENTER, MOVE, and EXIT. */
    static readonly MOVEMENT_SEGMENT_TYPES: {
        /** The segment crosses the boundary of the region and exits it. */
        EXIT: -1;
        /** The segment does not cross the boundary of the region and is contained within it. */
        MOVE: 0;
        /** The segment crosses the boundary of the region and enters it. */
        ENTER: 1;
    };

    /** The shapes of this Region in draw order. */
    get shapes(): readonly RegionShape[];

    /** The bottom elevation of this Region. */
    get bottom(): number;

    /** The top elevation of this Region. */
    get top(): number;

    /** The polygons of this Region. */
    get polygons(): readonly PIXI.Polygon[];

    /** The polygon tree of this Region. */
    get polygonTree(): RegionPolygonTree;

    /** The Clipper paths of this Region. */
    get clipperPaths(): readonly (readonly ClipperLib.IntPoint[])[];

    /**
     * The triangulation of this Region.
     * @type {Readonly<{vertices: Float32Array, indices: Uint16Array|Uint32Array}>}
     */
    get triangulation(): { vertices: Float32Array; indices: Uint16Array | Uint32Array };

    /** The geometry of this Region. */
    get geometry(): RegionGeometry;

    /** Is this Region currently visible on the Canvas? */
    get isVisible(): boolean;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    override _draw(options?: object): Promise<void>;

    /* -------------------------------------------- */
    /*  Incremental Refresh                         */
    /* -------------------------------------------- */

    override _applyRenderFlags(flags: Record<string, boolean>): void;

    /** Refresh the state of the Region. */
    protected _refreshState(): void;

    /** Refresh the border of the Region. */
    protected _refreshBorder(): void;

    /* -------------------------------------------- */
    /*  Shape Methods                               */
    /* -------------------------------------------- */

    /**
     * Test whether the given point (at the given elevation) is inside this Region.
     * @param   point         The point.
     * @param   [elevation]   The elevation of the point.
     * @returns               Is the point (at the given elevation) inside this Region?
     */
    testPoint(point: Point, elevation?: number): boolean;

    /**
     * Split the movement into its segments.
     * @param   waypoints                  The waypoints of movement.
     * @param   samples                    The points relative to the waypoints that are tested.
     *                                     Whenever one of them is inside the region, the moved object
     *                                     is considered to be inside the region.
     * @param   [options]                  Additional options
     * @param   [options.teleport=false]   Is it teleportation?
     * @returns                            The movement split into its segments.
     */
    segmentizeMovement(
        waypoints: RegionMovementWaypoint[],
        samples: Point[],
        options?: { teleport: boolean },
    ): RegionMovementSegment[];
}

/* -------------------------------------------- */

/** A shape of a {@link Region}. */
declare abstract class RegionShape<TData extends foundry.data.BaseShapeData = foundry.data.BaseShapeData> {
    /**
     * Create a RegionShape.
     * @param data    The shape data.
     */
    constructor(data: TData);

    /**
     * Create the RegionShape from the shape data.
     * @param   data    The shape data.
     */
    static create<TData extends foundry.data.RectangleShapeData>(data: TData): RegionRectangle;
    static create<TData extends foundry.data.CircleShapeData>(data: TData): RegionCircle;
    static create<TData extends foundry.data.EllipseShapeData>(data: TData): RegionEllipse;
    static create<TData extends foundry.data.PolygonShapeData>(data: TData): RegionPolygon;
    static create<TData extends foundry.data.BaseShapeData>(data: TData): RegionShape<TData>;

    /**
     * The data of this shape.
     * It is owned by the shape and must not be modified.
     */
    get data(): TData;

    /** Is this a hole? */
    get isHole(): boolean;

    /**
     * The Clipper paths of this shape.
     * The winding numbers are 1 or 0.
     */
    get clipperPaths(): readonly (readonly ClipperLib.IntPoint[])[];

    /** The Clipper polygon tree of this shape. */
    get clipperPolyTree(): ClipperLib.PolyTree;

    /**
     * Create the Clipper polygon tree of this shape.
     * This function may return a single positively-orientated and non-selfintersecting Clipper path instead of a tree,
     * which is automatically converted to a Clipper polygon tree.
     * This function is called only once. It is not called if the shape is empty.
     */
    protected abstract _createClipperPolyTree(): (ClipperLib.PolyTree | ClipperLib.IntPoint)[];

    /**
     * Draw shape into the graphics.
     * @param graphics    The graphics to draw the shape into.
     * @internal
     */
    protected _drawShape(graphics: PIXI.Graphics): void;
}

/** A rectangle of a {@link Region}. */
declare class RegionRectangle extends RegionShape<foundry.data.RectangleShapeData> {
    protected override _createClipperPolyTree(): (ClipperLib.PolyTree | ClipperLib.IntPoint)[];
}

/** A circle of a {@link Region}. */
declare class RegionCircle extends RegionShape<foundry.data.CircleShapeData> {
    protected override _createClipperPolyTree(): (ClipperLib.PolyTree | ClipperLib.IntPoint)[];
}

/**
 * An ellipse of a {@link Region}.
 * @extends {RegionShape<foundry.data.EllipseShapeData>}
 *
 * @param {foundry.data.EllipseShapeData} data    The shape data.
 */
declare class RegionEllipse extends RegionShape<foundry.data.EllipseShapeData> {
    protected override _createClipperPolyTree(): (ClipperLib.PolyTree | ClipperLib.IntPoint)[];
}

/** A polygon of a {@link Region}. */
declare class RegionPolygon extends RegionShape<foundry.data.PolygonShapeData> {
    protected override _createClipperPolyTree(): (ClipperLib.PolyTree | ClipperLib.IntPoint)[];
}

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
     * @type {PIXI.Polygon|null}
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
     * @param {Point} center     The center point of the circle.
     * @param {number} radius    The radius of the circle.
     * @returns {-1|0|1}          - -1: the circle is in the exterior and does not intersect the boundary.
     *                            - 0: the circle is intersects the boundary.
     *                            - 1: the circle is in the interior and does not intersect the boundary.
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

/**
 * The geometry of a {@link Region}.
 * - Vertex Attribute: `aVertexPosition` (`vec2`)
 * - Draw Mode: `PIXI.DRAW_MODES.TRIANGLES`
 */
declare class RegionGeometry extends PIXI.Geometry {
    /**
     * Create a RegionGeometry.
     * @param    region    The Region to create the RegionGeometry from.
     * @internal
     */
    constructor(region: Region);

    /** The Region this geometry belongs to. */
    get region(): Region;

    /**
     * Update the buffers.
     * @internal
     */
    _clearBuffers(): void;

    /**
     * Update the buffers.
     * @internal
     */
    _updateBuffers(): void;
}

/** A mesh of a {@link Region}. */
declare class RegionMesh<TShader extends AbstractBaseShader = RegionShader> extends PIXI.Container {
    /**
     * Create a RegionMesh.
     * @param region           The Region to create the RegionMesh from.
     * @param [shaderClass]    The shader class to use.
     */
    constructor(region: Region, shaderClass?: TShader);

    /** The Region of this RegionMesh. */
    get region(): Region;

    /** The shader bound to this RegionMesh. */
    get shader(): TShader;

    /** The blend mode assigned to this RegionMesh.*/
    get blendMode(): (typeof PIXI.BLEND_MODES)[keyof typeof PIXI.BLEND_MODES];
    set blendMode(value: (typeof PIXI.BLEND_MODES)[keyof typeof PIXI.BLEND_MODES]);

    /**
     * The tint applied to the mesh. This is a hex value.
     *
     * A value of 0xFFFFFF will remove any tint effect.
     * @defaultValue 0xFFFFFF
     */
    get tint(): number;
    set tint(tint: number);

    /** The tint applied to the mesh. This is a hex value. A value of 0xFFFFFF will remove any tint effect. */
    protected _tintColor: PIXI.Color;

    /**
     * Cached tint value for the shader uniforms.
     * @type {[red: number, green: number, blue: number, alpha: number]}
     * @internal
     */
    protected _cachedTint: number[];

    /** Used to track a tint or alpha change to execute a recomputation of _cachedTint. */
    protected _tintAlphaDirty: boolean;

    /**
     * Initialize shader based on the shader class type.
     * @param {type AbstractBaseShader} shaderClass  The shader class, which must inherit from {@link AbstractBaseShader}.
     */
    setShaderClass(shaderClass: AbstractBaseShader): void;

    /**
     * Tests if a point is inside this RegionMesh.
     * @param   point
     */
    containsPoint(point: Point): boolean;
}

/** The shader used by {@link RegionMesh}. */
declare class RegionShader extends AbstractBaseShader {}

declare global {
    interface RegionMovementWaypoint {
        /** The x-coordinates in pixels (integer). */
        x: number;
        /** The y-coordinates in pixels (integer). */
        y: number;
        /** The elevation in grid units. */
        elevation: number;
    }

    interface RegionMovementSegment {
        /** The type of this segment (see {@link Region.MOVEMENT_SEGMENT_TYPES}). */
        type: (typeof Region.MOVEMENT_SEGMENT_TYPES)[keyof typeof Region.MOVEMENT_SEGMENT_TYPES];
        /** The waypoint that this segment starts from */
        from: RegionMovementWaypoint;
        /** The waypoint that this segment goes to. */
        to: RegionMovementWaypoint;
    }
}
