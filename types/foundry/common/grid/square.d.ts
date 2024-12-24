import type { BaseGrid } from "./base.d.ts";

/** The square grid class. */
export class SquareGrid extends BaseGrid {
    override type: typeof CONST.GRID_TYPES.SQUARE;

    /** The rule for diagonal measurement (see {@link CONST.GRID_DIAGONALS}). */
    diagonals: number;

    /** The square grid constructor. */
    constructor(config: SquareGridConfiguration);

    override getOffset(coords: SquareGridCoordinates): GridOffset;

    override getOffsetRange(bounds: Rectangle): [number, number, number, number];

    override getAdjacentOffsets(coords: SquareGridCoordinates): GridOffset[];

    override testAdjacency(coords1: SquareGridCoordinates, coords2: SquareGridCoordinates): boolean;

    override getShiftedOffset(coords: SquareGridCoordinates, direction: MovementDirection): GridOffset;

    override getShiftedPoint(point: Point, direction: MovementDirection): Point;

    override getTopLeftPoint(coords: SquareGridCoordinates): Point;

    override getCenterPoint(coords: SquareGridCoordinates): Point;

    override getShape(): Point[];

    override getVertices(coords: SquareGridCoordinates): Point[];

    override getSnappedPoint(point: Point, behavior: GridSnappingBehavior): Point;

    override measurePath(
        waypoints: GridMeasurePathWaypoint[],
        options?: { cost?: GridMeasurePathCostFunction },
    ): SquareGridMeasurePathResult;

    protected override _measurePath(
        waypoints: GridMeasurePathWaypoint[],
        options: { cost?: GridMeasurePathCostFunction },
        result: GridMeasurePathResult,
    ): void;

    /** @see {@link https://en.wikipedia.org/wiki/Bresenham's_line_algorithm} */
    override getDirectPath(waypoints: GridMeasurePathWaypoint[]): GridOffset[];

    override getTranslatedPoint(point: Point, direction: number, distance: number): Point;

    override getCircle(center: Point, radius: number): Point[];

    override calculateDimensions(
        sceneWidth: number,
        sceneHeight: number,
        padding: number,
    ): { width: number; height: number; x: number; y: number; rows: number; columns: number };
}

export interface SquareGrid extends BaseGrid {
    get isGridless(): false;
    get isHexagonal(): false;
    get isSquare(): true;
}

declare global {
    interface SquareGridConfiguration extends GridConfiguration {
        /** The rule for diagonal measurement (see {@link CONST.GRID_DIAGONALS} */
        diagonals?: (typeof CONST.GRID_DIAGONALS)[keyof typeof CONST.GRID_DIAGONALS];
    }

    interface SquareGridMeasurePathResultWaypoint extends GridMeasurePathResultWaypoint {
        /** The total number of diagonals moved along a direct path up to this waypoint. */
        diagonals: number;
    }

    interface SquareGridMeasurePathResult extends GridMeasurePathResult {
        /** The total number of diagonals moved along a direct path through all waypoints. */
        diagonals: number;
    }

    type SquareGridCoordinates = GridCoordinates;
}
