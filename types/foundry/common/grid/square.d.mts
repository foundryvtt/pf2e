import { GridDiagonalRule, MovementDirection } from "@common/constants.mjs";
import { ElevatedPoint, Point, Rectangle } from "../_types.mjs";
import {
    GridConfiguration,
    GridCoordinates2D,
    GridCoordinates3D,
    GridMeasurePathCostFunction2D,
    GridMeasurePathCostFunction3D,
    GridMeasurePathResult,
    GridMeasurePathWaypointData2D,
    GridMeasurePathWaypointData3D,
    GridOffset2D,
    GridOffset3D,
    GridSnappingBehavior,
} from "./_types.mjs";
import { BaseGrid } from "./base.mjs";

/** The square grid class. */
export class SquareGrid extends BaseGrid {
    override readonly type: typeof CONST.GRID_TYPES.SQUARE;

    /** The rule for diagonal measurement (see {@link CONST.GRID_DIAGONALS}). */
    diagonals: GridDiagonalRule;

    /** The square grid constructor. */
    constructor(config: GridConfiguration);

    override getOffset(coords: GridCoordinates2D): GridOffset2D;
    override getOffset(coords: GridCoordinates3D): GridOffset3D;

    override getOffsetRange(bounds: Rectangle): [number, number, number, number];

    override getAdjacentOffsets(coords: GridCoordinates3D): GridOffset3D[];
    override getAdjacentOffsets(coords: GridCoordinates2D): GridOffset2D[];

    override testAdjacency(coords1: GridCoordinates3D, coords2: GridCoordinates3D): boolean;
    override testAdjacency(coords1: GridCoordinates2D, coords2: GridCoordinates2D): boolean;

    override getShiftedOffset(coords: GridCoordinates3D, direction: MovementDirection): GridOffset3D;
    override getShiftedOffset(coords: GridCoordinates2D, direction: MovementDirection): GridOffset2D;

    override getShiftedPoint(point: ElevatedPoint, direction: MovementDirection): ElevatedPoint;
    override getShiftedPoint(point: Point, direction: MovementDirection): Point;

    override getTopLeftPoint(coords: GridCoordinates3D): ElevatedPoint;
    override getTopLeftPoint(coords: GridCoordinates2D): Point;
    override getTopLeftPoint(coords: GridCoordinates2D | GridCoordinates3D): Point | ElevatedPoint;

    override getCenterPoint(coords: GridCoordinates3D): ElevatedPoint;
    override getCenterPoint(coords: GridCoordinates2D): Point;
    override getCenterPoint(coords: GridCoordinates2D | GridCoordinates3D): Point | ElevatedPoint;

    override getShape(): Point[];

    override getVertices(coords: GridCoordinates2D): Point[];

    override getSnappedPoint(point: ElevatedPoint, behavior: GridSnappingBehavior): ElevatedPoint;
    override getSnappedPoint(point: Point, behavior: GridSnappingBehavior): Point;

    protected override _measurePath(
        waypoints: GridMeasurePathWaypointData3D[],
        options: { cost?: GridMeasurePathCostFunction3D },
        result: GridMeasurePathResult,
    ): void;
    protected override _measurePath(
        waypoints: GridMeasurePathWaypointData2D[],
        options: { cost?: GridMeasurePathCostFunction2D },
        result: GridMeasurePathResult,
    ): void;

    override getDirectPath(waypoints: GridCoordinates2D[]): GridOffset2D[];
    override getDirectPath(waypoints: GridCoordinates3D[]): GridOffset3D[];

    override getTranslatedPoint(point: Point, direction: MovementDirection, distance: number): Point;
    override getTranslatedPoint(point: ElevatedPoint, direction: MovementDirection, distance: number): ElevatedPoint;

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
