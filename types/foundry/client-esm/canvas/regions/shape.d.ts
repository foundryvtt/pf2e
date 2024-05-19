import * as ClipperLib from "js-angusj-clipper";

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
    static create<TData extends foundry.data.CircleShapeData>(data: TData): RegionCircle;
    static create<TData extends foundry.data.EllipseShapeData>(data: TData): RegionEllipse;
    static create<TData extends foundry.data.PolygonShapeData>(data: TData): RegionPolygon;
    static create<TData extends foundry.data.RectangleShapeData>(data: TData): RegionRectangle;
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

/** A circle of a {@link Region}. */
declare class RegionCircle extends RegionShape<foundry.data.CircleShapeData> {
    protected override _createClipperPolyTree(): (ClipperLib.PolyTree | ClipperLib.IntPoint)[];
}

/** An ellipse of a {@link Region}. */
declare class RegionEllipse extends RegionShape<foundry.data.EllipseShapeData> {
    protected override _createClipperPolyTree(): (ClipperLib.PolyTree | ClipperLib.IntPoint)[];
}

/** A polygon of a {@link Region}. */
declare class RegionPolygon extends RegionShape<foundry.data.PolygonShapeData> {
    protected override _createClipperPolyTree(): (ClipperLib.PolyTree | ClipperLib.IntPoint)[];
}

/** A rectangle of a {@link Region}. */
declare class RegionRectangle extends RegionShape<foundry.data.RectangleShapeData> {
    protected override _createClipperPolyTree(): (ClipperLib.PolyTree | ClipperLib.IntPoint)[];
}
