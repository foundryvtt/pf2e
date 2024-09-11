import type { BaseGrid } from "./base.d.ts";

/** The gridless grid class. */
export class GridlessGrid extends BaseGrid {
    override type: typeof CONST.GRID_TYPES.GRIDLESS;

    override calculateDimensions(
        sceneWidth: number,
        sceneHeight: number,
        padding: number,
    ): { width: number; height: number; x: number; y: number; rows: number; columns: number };

    override getOffset(coords: GridCoordinates): GridOffset;

    override getOffsetRange(bounds: Rectangle): [number, number, number, number];

    override getAdjacentOffsets(coords: GridCoordinates): GridOffset[];

    override testAdjacency(coords1: GridCoordinates, coords2: GridCoordinates): boolean;

    override getShiftedOffset(coords: GridCoordinates, direction: MovementDirection): GridOffset;

    override getShiftedPoint(point: Point, direction: MovementDirection): Point;

    override getTopLeftPoint(coords: GridCoordinates): Point;

    override getCenterPoint(coords: GridCoordinates): Point;

    override getShape(): Point[];

    override getVertices(coords: GridCoordinates): Point[];

    override getSnappedPoint(point: Point, behavior: GridSnappingBehavior): Point;

    protected override _measurePath(
        waypoints: GridMeasurePathWaypoint[],
        options: { cost?: GridMeasurePathCostFunction },
        result: GridMeasurePathResult,
    ): void;

    override getDirectPath(waypoints: GridMeasurePathWaypoint[]): GridOffset[];

    override getTranslatedPoint(point: Point, direction: number, distance: number): Point;

    override getCircle(center: Point, radius: number): Point[];

    override getCone(origin: Point, radius: number, direction: number, angle: number): Point[];
}

export interface GridlessGrid extends BaseGrid {
    get isGridless(): true;
    get isHexagonal(): false;
    get isSquare(): false;
}
