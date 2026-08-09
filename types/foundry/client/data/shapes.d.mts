import { ClipperPoint, Ray } from "@client/canvas/geometry/_module.mjs";
import Scene from "@client/documents/scene.mjs";
import { Point } from "@common/_types.mjs";
import { DataModel, DataModelConstructionContext, DataModelUpdateOptions } from "@common/abstract/_module.mjs";
import { DataModelUpdateState } from "@common/data/_types.mjs";
import * as data from "@common/data/data.mjs";
import { BaseGrid } from "@common/grid/base.mjs";
import { GridlessGrid } from "@common/grid/gridless.mjs";
import { PolygonTree } from "./polygon-tree.mjs";

type BaseShapeDataStatic = typeof data.BaseShapeData;

/**
 * Mixin a BaseShapeData subclass.
 * @param ShapeData
 */
declare function ClientShapeDataMixin<TShape extends data.BaseShapeData>(
    ShapeData: ConstructorOf<TShape>,
): ConstructorOf<ClientShapeData & TShape> & BaseShapeDataStatic & ClientShapeDataStatic;

interface ClientShapeDataStatic {
    /**
     * Convert a path to a clipper path.
     * @param path A path
     * @internal
     */
    _toClipperPath(path: ClipperPoint[] | Point[] | number[]): ClipperPoint[];
}

declare abstract class ClientShapeData extends data.BaseShapeData {
    /**
     * The scene that this shape is placed in, if any.
     */
    get scene(): Scene | null;

    /**
     * The grid that this shape is placed in.
     */
    get grid(): BaseGrid;

    /**
     * The gridless version of the grid that this shape is placed in.
     */
    get gridlessGrid(): GridlessGrid;

    /**
     * Is this shape empty?
     */
    get isEmpty(): boolean;

    /**
     * The polygons of this shape. The value of this property must not be mutated.
     */
    get polygons(): readonly PIXI.Polygon[];

    /**
     * The polygon tree of this shape. The value of this property must not be mutated.
     */
    get polygonTree(): PolygonTree;

    /**
     * The Clipper paths of this shape. The winding numbers are 1 or 0. The value of this property must not be
     * mutated.
     */
    get clipperPaths(): DeepReadonly<ClipperPoint[][]>;

    /**
     * The Clipper polygon tree of this shape.
     *
     * The value of this property must not be mutated.
     */
    get clipperPolyTree(): ClipperLib.PolyTree;

    /**
     * The triangulation of this shape.
     *
     * The value of this property must not be mutated.
     */
    get triangulation(): Readonly<{ vertices: Float32Array; indices: Uint16Array | Uint32Array }>;

    /**
     * The bounds of this Region.
     *
     * The value of this property must not be mutated.
     */
    get bounds(): PIXI.Rectangle;

    /**
     * The origin of this shape.
     */
    get origin(): Readonly<Point>;

    /**
     * The center point of this shape.
     */
    get center(): Readonly<Point>;

    /**
     * The area of this shape.
     */
    get area(): number;

    /**
     * The measured segments of this shape.
     * Each segment consist of a ray, winding order, distance in grid units, and the angle in degrees if it has one.
     * The ray represents the measured segment. If the winding order is ...
     *  - 1, the segment is an edge in positive orientation.
     *  - -1, the segment is an edge in negative orientation.
     *  - 0, the segment is not an edge.
     *
     * The distance is the actual grid distance if the shape is grid-based.
     * Otherwise the distance is the distance in pixels divided by of the ratio of grid distance and grid size.
     */
    get measuredSegments(): DeepReadonly<{ ray: Ray; winding: -1 | 0 | 1; distance: number; angle?: number }[]>;

    /**
     * The control handles of this shape.
     * Each handle has a position and a rotation in radians.
     */
    get controlHandles(): DeepReadonly<Record<string, { position: Point; rotation: number; visible: boolean }>>;

    protected override _updateCommit(
        copy: object,
        diff: object,
        options: DataModelUpdateOptions,
        _state: DataModelUpdateState,
    ): void;

    override clone(data?: Record<string, unknown>, context?: DataModelConstructionContext<DataModel | null>): this;

    /**
     * Called when the shape was changed.
     * This function is not called when just the hole state is changed.
     * This function is not called if grid-based is changed and the grid is gridless.
     */
    protected _onShapeChange(): void;

    /**
     * Called when the grid this shape is placed in changes.
     * @param changed The changes to the grid.
     */
    protected _onGridChange(changed: object): void;

    /**
     * Is this shape currently affected by the grid?
     */
    get isAffectedByGrid(): boolean;

    /**
     * Whether the shape is identical to itself after a rotation around its origin.
     */
    get hasRotationalSymmetry(): boolean;

    /**
     * Create a ray.
     * @param x The x-coordinate of the origin of the ray.
     * @param y The y-coordinate of the origin of the ray.
     * @param direction The direction of the ray in degrees.
     * @param length The length of the ray in pixels.
     * @param alignment The alignment to ray.
     * @internal
     */
    _createRay(x: number, y: number, direction: number, length: number, alignment?: number): Ray;

    /**
     * Snap the given point.
     * @param point The point that is to be snapped.
     * @returns The snapped point.
     * @internal
     */
    _getSnappedPoint(point: Point): Point;

    /**
     * Get the size for the given ray defined by a length and direction.
     * @param length The length of the ray in pixels.
     * @param direction The direction of the ray in radians.
     * @param options Additional options.
     * @param options.snap Snap the size to with defined grid snapping precision?
     * @param options.round Round the size to integer?
     * @param options.allowZero Allow the size to be zero?
     * @returns The snapped size in pixels.
     * @internal
     */
    _calculateSize(
        length: number,
        direction: number,
        options?: { snap?: boolean; round?: boolean; allowZero?: boolean },
    ): number;

    /**
     * Snap the given rotation.
     * @param rotation The rotation to be snapped in degrees.
     * @returns The snapped rotation in degrees.
     * @internal
     */
    _getSnappedRotation(rotation: number): number;

    /**
     * Test whether given point is contained within this shape.
     * @param point The point.
     */
    testPoint(point: Point): boolean;

    /**
     * Create the Clipper polygon tree of this shape.
     * This function may return a single positively-orientated and non-selfintersecting Clipper path instead of a tree,
     * which is automatically converted to a Clipper polygon tree.
     * This function is called only once. It is not called if the shape is empty.
     */
    protected abstract _createClipperPolyTree(): ClipperLib.PolyTree | ClipperPoint[] | Point[] | number[];

    /**
     * Create the origin point of this shape.
     */
    protected _createOrigin(): Point;

    /**
     * Create the center point of this shape.
     */
    protected _createCenter(): Point;

    /**
     * Calculate the area of this shape.
     */
    protected _calculateArea(): number;

    /**
     * Move the shape to the given origin.
     * @param origin The (unsnapped) origin.
     * @param options Additional options.
     * @param options.snap Snap the origin?
     */
    move(origin: Point, options?: { snap?: boolean }): void;

    /**
     * Rotate the shape by the given angle in degrees around the origin (or pivot).
     * @param angle The angle in degrees.
     * @param options Additional options.
     * @param options.pivot The pivot of rotation. Default: origin.
     */
    rotate(angle: number, options?: { pivot?: Point }): void;

    /**
     * Rotate the shape by the given angle in degrees around the origin.
     * @param angle The angle in degrees.
     */
    protected _rotate(angle: number): void;

    /**
     * Draw the shape into the Graphics element.
     * @param graphics The Graphics element
     */
    drawShape(graphics: PIXI.Graphics): void;

    /**
     * Draw reference lines of the shape into the Graphics element, if it has any.
     * @param graphics The Graphics element
     */
    drawReferenceLines(graphics: PIXI.Graphics): void;

    /**
     * Create a measured segment.
     * @param x The x-coordinate of the origin of the ray.
     * @param y The y-coordinate of the origin of the ray.
     * @param direction The direction of the ray in degrees.
     * @param length The length of the ray in pixels.
     * @param alignment The alignment of the ray.
     * @param winding The winding order.
     * @param angle The angle in degrees.
     */
    protected _createMeasuredSegment(
        x: number,
        y: number,
        direction: number,
        length: number,
        alignment: number,
        winding: -1 | 0 | 1,
        angle: number,
    ): { ray: Ray; winding: -1 | 0 | 1; distance: number; angle?: number };

    /**
     * Create the measured segments of this shape.
     */
    protected _createMeasuredSegments(): { ray: Ray; winding: -1 | 0 | 1; distance: number; angle?: number }[];

    /**
     * Get the control handles for this shape.
     * @returns The position, rotation in radians, and visible state for each handle.
     */
    protected abstract _createControlHandles(): Record<string, { position: Point; rotation: number; visible: boolean }>;

    /**
     * Move the control handle to the destination position.
     * @param name The handle name.
     * @param destination The destination of the handle.
     * @param options Additional options.
     * @param options.snap Snapping?
     * @param options.unlinked Unlinked scaling?
     *
     */
    abstract moveControlHandle(
        name: string,
        destination: Point,
        options?: { snap?: boolean; unlinked?: boolean },
    ): void;

    /**
     * Transform this shape by moving a scale handle.
     * @param fieldName The field name of the axis that is scaled.
     * @param origin The origin.
     * @param direction The direction of the axis in degrees.
     * @param alignment The alignment of the axis.
     * @param destination The handle destination.
     * @param snap Snap?
     * @param allowZero Allow zero size?
     * @param max The maximum value.
     * @internal
     */
    _moveScaleHandle(
        fieldName: string,
        origin: Point,
        direction: number,
        alignment: number,
        destination: Point,
        snap: boolean,
        allowZero: boolean,
        max: number,
    ): void;

    /**
     * Transform this shape by moving a rotation handle.
     * @param direction The direction of the rotation handle in degrees.
     * @param destination The handle destination.
     * @param snap Snap?
     * @internal
     */
    _moveRotationHandle(direction: number, destination: Point, snap: boolean): void;

    /**
     * Transform this shape by moving the sweep handle.
     * @param maxAngle The maximum angle possible.
     * @param destination The handle destination.
     * @param snap Snap?
     * @internal
     */
    _moveSweepHandle(maxAngle: number, destination: Point, snap: boolean): void;

    /**
     * Handle the drag start event for the creation of this shape.
     * @param event The pointer event.
     */
    protected _onDragStart(event: PIXI.FederatedMouseEvent): void;

    /**
     * Handle the drag move event for the creation of this shape.
     * @param event The pointer event.
     */
    protected abstract _onDragMove(event: PIXI.FederatedMouseEvent): void;

    /* -------------------------------------------- */
    /*  Sampling                                    */
    /* -------------------------------------------- */

    /**
     * Sample a point from the shape interior.
     * @param out A point to write to.
     * @returns The sampled point.
     * @throws {Error} If the shape is empty.
     */
    sampleInterior(out?: Point): Point;

    /**
     * Sample a point from the shape boundary.
     * @param out A point to write to.
     * @returns The sampled point.
     * @throws {Error} If the shape is empty.
     */
    sampleBoundary(out?: Point): Point;
}

/**
 * The data model for a rectangle shape.
 */
export class RectangleShapeData extends ClientShapeDataMixin(data.RectangleShapeData) {
    /**
     * Get the rays for both axes.
     * @returns {{axisX: Ray; axisY: Ray}}
     * @internal
     */
    _getRays(): { axisX: Ray; axisY: Ray };

    override get isEmpty(): boolean;

    override clone(data?: Record<string, unknown>, context?: DataModelConstructionContext<DataModel | null>): this;

    override _onShapeChange(): void;

    protected override _createClipperPolyTree(): ClipperLib.PolyTree | ClipperPoint[] | Point[] | number[];

    protected override _createCenter(): Point;

    protected override _calculateArea(): number;

    override sampleInterior(out?: Point): Point;

    override sampleBoundary(out?: Point): Point;

    override drawShape(graphics: PIXI.Graphics): void;

    protected override _createMeasuredSegment(): { ray: Ray; winding: -1 | 0 | 1; distance: number; angle?: number };

    protected override _createControlHandles(): Record<string, { position: Point; rotation: number; visible: boolean }>;

    override moveControlHandle(
        name: string,
        destination: Point,
        options?: { snap?: boolean; unlinked?: boolean },
    ): void;

    protected override _onDragMove(event: PIXI.FederatedMouseEvent): void;
}

/**
 * The data model for a circle shape.
 */
export class CircleShapeData extends ClientShapeDataMixin(data.CircleShapeData) {
    override get isEmpty(): boolean;

    protected override _createClipperPolyTree(): Point[];

    protected override _calculateArea(): number;

    override sampleInterior(out?: Point): Point;

    override sampleBoundary(out?: Point): Point;

    protected override _rotate(angle: number): void;

    override drawShape(graphics: PIXI.Graphics): void;

    protected override _createMeasuredSegment(): { ray: Ray; winding: -1 | 0 | 1; distance: number; angle?: number };

    protected override _createControlHandles(): Record<string, { position: Point; rotation: number; visible: boolean }>;

    override moveControlHandle(
        name: string,
        destination: Point,
        options?: { snap?: boolean; unlinked?: boolean },
    ): void;

    protected override _onDragMove(event: PIXI.FederatedMouseEvent): void;
}

/* -------------------------------------------- */

/**
 * The data model for an ellipse shape.
 */
export class EllipseShapeData extends ClientShapeDataMixin(data.EllipseShapeData) {
    /**
     * Get the rays for both axes.
     * @internal
     */
    _getRays(): { axisX: Ray; axisY: Ray };

    override get isEmpty(): boolean;

    override clone(data?: Record<string, unknown>, context?: DataModelConstructionContext<DataModel | null>): this;

    protected override _onShapeChange(): void;

    protected override _createClipperPolyTree(): ClipperLib.PolyTree | ClipperPoint[] | Point[] | number[];

    protected override _calculateArea(): number;

    override sampleInterior(out?: Point): Point;

    override drawShape(graphics: PIXI.Graphics): void;

    protected override _createMeasuredSegment(): { ray: Ray; winding: -1 | 0 | 1; distance: number; angle?: number };

    protected override _createControlHandles(): Record<string, { position: Point; rotation: number; visible: boolean }>;

    override moveControlHandle(
        name: string,
        destination: Point,
        options?: { snap?: boolean; unlinked?: boolean },
    ): void;

    protected override _onDragMove(event: PIXI.FederatedMouseEvent): void;
}

/**
 * The data model for a cone shape.
 */
export class ConeShapeData extends ClientShapeDataMixin(data.ConeShapeData) {
    /**
     * Get the left, center, and right rays of this cone.
     * @internal
     */
    _getRays(): { left: Ray; center: Ray; right: Ray };

    override get isEmpty(): boolean;

    override clone(data?: Record<string, unknown>, context?: DataModelConstructionContext<DataModel | null>): this;

    protected override _onShapeChange(): void;

    protected override _createClipperPolyTree(): ClipperLib.PolyTree | ClipperPoint[] | Point[] | number[];

    protected override _createCenter(): Point;

    protected override _calculateArea(): number;

    protected override _createMeasuredSegment(): { ray: Ray; winding: -1 | 0 | 1; distance: number; angle?: number };

    protected override _createControlHandles(): Record<string, { position: Point; rotation: number; visible: boolean }>;

    override moveControlHandle(
        name: string,
        destination: Point,
        options?: { snap?: boolean; unlinked?: boolean },
    ): void;

    protected override _onDragMove(event: PIXI.FederatedMouseEvent): void;
}

/**
 * The data model for a ring shape.
 */
export class RingShapeData extends ClientShapeDataMixin(data.RingShapeData) {
    override get isEmpty(): boolean;

    override clone(data?: Record<string, unknown>, context?: DataModelConstructionContext<DataModel | null>): this;

    protected override _onShapeChange(): void;

    protected override _createClipperPolyTree(): ClipperLib.PolyTree | ClipperPoint[] | Point[] | number[];

    protected override _calculateArea(): number;

    override sampleInterior(out?: Point): Point;

    override sampleBoundary(out?: Point): Point;

    protected override _rotate(angle: number): void;

    override drawShape(graphics: PIXI.Graphics): void;

    override drawReferenceLines(graphics: PIXI.Graphics): void;

    protected override _createMeasuredSegment(): { ray: Ray; winding: -1 | 0 | 1; distance: number; angle?: number };

    protected override _createControlHandles(): Record<string, { position: Point; rotation: number; visible: boolean }>;

    override moveControlHandle(
        name: string,
        destination: Point,
        options?: { snap?: boolean; unlinked?: boolean },
    ): void;

    protected override _onDragMove(event: PIXI.FederatedMouseEvent): void;
}

/**
 * The data model for a line shape.
 */
export class LineShapeData extends ClientShapeDataMixin(data.LineShapeData) {
    /**
     * Get the rays for both axes.
     * @internal
     */
    _getRays(): { axisX: Ray; axisY: Ray };

    override get isEmpty(): boolean;

    override clone(data?: Record<string, unknown>, context?: DataModelConstructionContext<DataModel | null>): this;

    protected _onShapeChange(): void;

    protected override _createClipperPolyTree(): ClipperLib.PolyTree | ClipperPoint[] | Point[] | number[];

    protected override _createCenter(): Point;

    protected override _calculateArea(): number;

    override sampleInterior(out?: Point): Point;

    override sampleBoundary(out?: Point): Point;

    protected override _createMeasuredSegment(): { ray: Ray; winding: -1 | 0 | 1; distance: number; angle?: number };

    protected override _createControlHandles(): Record<string, { position: Point; rotation: number; visible: boolean }>;

    override moveControlHandle(
        name: string,
        destination: Point,
        options?: { snap?: boolean; unlinked?: boolean },
    ): void;

    protected override _onDragMove(event: PIXI.FederatedMouseEvent): void;
}

/**
 * The data model for an emanation shape.
 */
export class EmanationShapeData extends ClientShapeDataMixin(data.EmanationShapeData) {
    override get isEmpty(): boolean;

    protected override _onShapeChange(): void;

    override get isAffectedByGrid(): boolean;

    override get hasRotationalSymmetry(): boolean;

    protected override _createClipperPolyTree(): ClipperLib.PolyTree | ClipperPoint[] | Point[] | number[];

    protected override _createOrigin(): Point;

    override move(origin: Point, options?: { snap?: boolean }): void;

    protected override _rotate(angle: number): void;

    override drawReferenceLines(graphics: PIXI.Graphics): void;

    protected override _createMeasuredSegment(): { ray: Ray; winding: -1 | 0 | 1; distance: number; angle?: number };

    protected override _createControlHandles(): Record<string, { position: Point; rotation: number; visible: boolean }>;

    override moveControlHandle(
        name: string,
        destination: Point,
        options?: { snap?: boolean; unlinked?: boolean },
    ): void;

    protected override _onDragMove(event: PIXI.FederatedMouseEvent): void;
}

/**
 * The data model for a polygon shape.
 */
export class PolygonShapeData extends ClientShapeDataMixin(data.PolygonShapeData) {
    override get hasRotationalSymmetry(): boolean;

    protected override _createClipperPolyTree(): ClipperLib.PolyTree | ClipperPoint[] | Point[] | number[];

    override _createOrigin(): Point;

    override _getSnappedPoint(point: Point): Point;

    override _calculateSize(
        length: number,
        direction: number,
        options?: { snap?: boolean; round?: boolean; allowZero?: boolean },
    ): number;

    override move(origin: Point, options?: { snap?: boolean }): void;

    protected override _rotate(angle: number): void;

    protected override _createMeasuredSegments(): never[];

    protected override _createControlHandles(): Record<string, { position: Point; rotation: number; visible: boolean }>;

    override moveControlHandle(
        name: string,
        destination: Point,
        options?: { snap?: boolean; unlinked?: boolean },
    ): void;

    protected override _onDragStart(event: PIXI.FederatedMouseEvent): void;

    protected override _onDragMove(event: PIXI.FederatedMouseEvent): void;
}

/**
 * The data model for a token shape.
 */
export class TokenShapeData extends ClientShapeDataMixin(data.TokenShapeData) {
    /**
     * Get the token shape.
     * @internal
     */
    _getTokenShape(): CircleShapeData | EllipseShapeData | PolygonShapeData;

    override get isEmpty(): false;

    override get polygonTree(): PolygonTree;

    override sampleInterior(out?: Point): Point;

    override sampleBoundary(out?: Point): Point;

    protected override _onShapeChange(): void;

    override get isAffectedByGrid(): true;

    protected override _createClipperPolyTree(): ClipperLib.PolyTree | ClipperPoint[] | Point[] | number[];

    protected override _createOrigin(): Point;

    override move(origin: Point, options?: { snap?: boolean }): void;

    protected override _rotate(angle: number): void;

    protected override _createMeasuredSegments(): never[];

    protected override _createControlHandles(): Record<string, { position: Point; rotation: number; visible: boolean }>;

    override moveControlHandle(
        name: string,
        destination: Point,
        options?: { snap?: boolean; unlinked?: boolean },
    ): void;

    protected override _onDragMove(event: PIXI.FederatedMouseEvent): void;
}

/**
 * The data model for a shape that is the union of grid spaces.
 */
export class GridShapeData extends ClientShapeDataMixin(data.GridShapeData) {
    override get isEmpty(): boolean;

    override get isAffectedByGrid(): true;

    override get hasRotationalSymmetry(): boolean;

    protected override _onShapeChange(): void;

    override testPoint(point: Point): boolean;

    protected override _createClipperPolyTree(): ClipperLib.PolyTree | ClipperPoint[] | Point[] | number[];

    protected override _createOrigin(): Point;

    override move(origin: Point, options?: { snap?: boolean }): void;

    /**
     * @see {@link https://www.redblobgames.com/grids/hexagons/implementation.html#rotation}
     */
    protected override _rotate(angle: number): void;

    protected override _createMeasuredSegments(): never[];

    protected override _createControlHandles(): Record<string, { position: Point; rotation: number; visible: boolean }>;

    override moveControlHandle(
        name: string,
        destination: Point,
        options?: { snap?: boolean; unlinked?: boolean },
    ): void;

    protected override _onDragMove(event: PIXI.FederatedMouseEvent): void;
}
