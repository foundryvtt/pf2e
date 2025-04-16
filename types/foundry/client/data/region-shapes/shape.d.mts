import Region from "@client/canvas/placeables/region.mjs";
import RegionDocument from "@client/documents/region.mjs";
import {
    BaseShapeData,
    CircleShapeData,
    EllipseShapeData,
    PolygonShapeData,
    RectangleShapeData,
} from "@common/data/data.mjs";

/**
 * A shape of a {@link RegionDocument}.
 */
export abstract class RegionShape<TShapeData extends BaseShapeData = BaseShapeData> {
    /**
     * Create a RegionShape.
     */
    constructor(data: TShapeData);

    /**
     * Create the RegionShape from the shape data.
     */
    static create(data: CircleShapeData | EllipseShapeData | PolygonShapeData | RectangleShapeData): RegionShape;

    /**
     * The data of this shape.
     * It is owned by the shape and must not be modified.
     */
    get data(): TShapeData;

    /**
     * Is this a hole?
     */
    get isHole(): boolean;

    /**
     * The Clipper paths of this shape.
     * The winding numbers are 1 or 0.
     * @type {}
     */
    get clipperPaths(): ReadonlyArray<ReadonlyArray<ClipperLib.IntPoint>>;

    /**
     * The Clipper polygon tree of this shape.
     */
    get clipperPolyTree(): ClipperLib.PolyTree;

    /**
     * Create the Clipper polygon tree of this shape.
     * This function may return a single positively-orientated and non-selfintersecting Clipper path instead of a tree,
     * which is automatically converted to a Clipper polygon tree.
     * This function is called only once. It is not called if the shape is empty.
     */
    protected abstract _createClipperPolyTree(): ClipperLib.PolyTree | ClipperLib.IntPoint[];
}

/* -------------------------------------------- */

/**
 * A circle of a {@link Region}.
 */
export class RegionCircleShape extends RegionShape<CircleShapeData> {
    /**
     * @param data The circle shape data.
     */
    constructor(data: CircleShapeData);

    protected override _createClipperPolyTree(): ClipperLib.IntPoint[];
}

/**
 * An ellipse of a {@link Region}.
 */
export class RegionEllipseShape extends RegionShape<EllipseShapeData> {
    /**
     * @param data The ellipse shape data.
     */
    constructor(data: EllipseShapeData);

    protected override _createClipperPolyTree(): ClipperLib.IntPoint[];
}

/**
 * A polygon of a {@link Region}.
 */
export class RegionPolygonShape extends RegionShape<PolygonShapeData> {
    /**
     * @param data The polygon shape data.
     */
    constructor(data: PolygonShapeData);

    protected override _createClipperPolyTree(): ClipperLib.IntPoint[];
}

/**
 * A rectangle of a {@link Region}.
 */
export class RegionRectangleShape extends RegionShape<RectangleShapeData> {
    /**
     * @param data The rectangle shape data.
     */
    constructor(data: RectangleShapeData);

    protected override _createClipperPolyTree(): ClipperLib.IntPoint[];
}
