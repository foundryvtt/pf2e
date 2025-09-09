import { ElevatedPoint, Point, Rectangle } from "@common/_types.mjs";
import { GridDiagonalRule, MovementDirection } from "@common/constants.mjs";
import {
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
    HexagonalGridConfiguration,
    HexagonalGridCoordinates2D,
    HexagonalGridCoordinates3D,
    HexagonalGridCube2D,
    HexagonalGridCube3D,
} from "./_types.mjs";
import { BaseGrid } from "./base.mjs";

/** The hexagonal grid class. */
export class HexagonalGrid extends BaseGrid {
    override readonly type:
        | typeof CONST.GRID_TYPES.HEXEVENQ
        | typeof CONST.GRID_TYPES.HEXODDQ
        | typeof CONST.GRID_TYPES.HEXEVENR
        | typeof CONST.GRID_TYPES.HEXODDR;

    /** Is this grid column-based (flat-topped) or row-based (pointy-topped)? */
    columns: boolean;

    /** Is this grid even or odd? */
    even: boolean;

    /**
     * The rule for diagonal measurement (see {@link CONST.GRID_DIAGONALS}).
     */
    readonly diagonals: GridDiagonalRule;

    /** The hexagonal grid constructor. */
    constructor(config: HexagonalGridConfiguration);

    override getOffset(coords: GridCoordinates2D): GridOffset2D;
    override getOffset(coords: GridCoordinates3D): GridOffset3D;

    override getOffsetRange(bounds: Rectangle): [number, number, number, number];

    override getAdjacentOffsets(coords: GridCoordinates2D): GridOffset2D[];
    override getAdjacentOffsets(coords: GridCoordinates3D): GridOffset3D[];

    override testAdjacency(coords1: GridCoordinates2D, coords2: GridCoordinates2D): boolean;
    override testAdjacency(coords1: GridCoordinates3D, coords2: GridCoordinates3D): boolean;

    override getShiftedOffset(coords: GridCoordinates2D, direction: MovementDirection): GridOffset2D;
    override getShiftedOffset(coords: GridCoordinates3D, direction: MovementDirection): GridOffset3D;

    override getShiftedPoint(point: Point, direction: MovementDirection): Point;
    override getShiftedPoint(point: ElevatedPoint, direction: MovementDirection): ElevatedPoint;

    /**
     * Returns the cube coordinates of the grid space corresponding to the given coordinates.
     * @param coords The coordinates
     * @returns The cube coordinates
     */
    getCube(coords: HexagonalGridCoordinates2D): HexagonalGridCube2D;
    getCube(coords: HexagonalGridCoordinates3D): HexagonalGridCube3D;

    /**
     * Returns the cube coordinates of grid spaces adjacent to the one corresponding to the given coordinates.
     * @param   coords   The coordinates
     * @returns          The adjacent cube coordinates
     */
    getAdjacentCubes(coords: HexagonalGridCoordinates2D): HexagonalGridCube2D[];
    getAdjacentCubes(coords: HexagonalGridCoordinates3D): HexagonalGridCube3D[];

    /**
     * Returns the cube coordinates of the grid space corresponding to the given coordinates
     * shifted by one grid space in the given direction.
     * @param  coords    The coordinates
     * @param  direction The direction (see {@link CONST.MOVEMENT_DIRECTIONS})
     */
    getShiftedCube(coords: HexagonalGridCoordinates2D, direction: MovementDirection): HexagonalGridCube2D;
    getShiftedCube(coords: HexagonalGridCoordinates3D, direction: MovementDirection): HexagonalGridCube3D;

    override getTopLeftPoint(coords: GridCoordinates2D): Point;
    override getTopLeftPoint(coords: GridCoordinates3D): ElevatedPoint;

    override getCenterPoint(coords: GridCoordinates2D): Point;
    override getCenterPoint(coords: GridCoordinates3D): ElevatedPoint;

    override getShape(): Point[];

    override getVertices(coords: GridCoordinates2D): Point[];

    override getSnappedPoint(point: Point, behavior: GridSnappingBehavior): Point;
    override getSnappedPoint(point: ElevatedPoint, behavior: GridSnappingBehavior): ElevatedPoint;

    override calculateDimensions(
        sceneWidth: number,
        sceneHeight: number,
        padding: number,
    ): { width: number; height: number; x: number; y: number; rows: number; columns: number };

    protected override _measurePath(
        waypoints: GridMeasurePathWaypointData2D[],
        options: { cost?: GridMeasurePathCostFunction2D },
        result: GridMeasurePathResult,
    ): void;
    protected override _measurePath(
        waypoints: GridMeasurePathWaypointData3D[],
        options: { cost?: GridMeasurePathCostFunction3D },
        result: GridMeasurePathResult,
    ): void;

    override getDirectPath(waypoints: GridCoordinates2D[]): GridOffset2D[];
    override getDirectPath(waypoints: GridCoordinates3D[]): GridOffset3D[];

    override getTranslatedPoint(point: Point, direction: number, distance: number): Point;

    override getCircle(center: Point, radius: number): Point[];

    /* -------------------------------------------- */
    /*  Conversion Functions                        */
    /* -------------------------------------------- */

    /**
     * Round the fractional cube coordinates (q, r, s).
     * @see {@link https://www.redblobgames.com/grids/hexagons/}
     * @param   cube    The fractional cube coordinates
     * @returns         The rounded integer cube coordinates
     */
    static cubeRound(cube: HexagonalGridCube2D): HexagonalGridCube2D;
    static cubeRound(cube: HexagonalGridCube3D): HexagonalGridCube3D;

    /**
     * Convert point coordinates (x, y) into cube coordinates (q, r, s).
     * Inverse of {@link HexagonalGrid#cubeToPoint}.
     * @see {@link https://www.redblobgames.com/grids/hexagons/}
     * @param   point   The point
     * @returns         The (fractional) cube coordinates
     */
    pointToCube(point: Point): HexagonalGridCube2D;
    pointToCube(point: ElevatedPoint): HexagonalGridCube3D;

    /**
     * Convert cube coordinates (q, r, s) into point coordinates (x, y).
     * Inverse of {@link HexagonalGrid#pointToCube}.
     * @see {@link https://www.redblobgames.com/grids/hexagons/}
     * @param   cube    The cube coordinates
     * @returns         The point coordinates
     */
    cubeToPoint(cube: HexagonalGridCube2D): Point;
    cubeToPoint(cube: HexagonalGridCube3D): ElevatedPoint;

    /**
     * Convert offset coordinates (i, j) into integer cube coordinates (q, r, s).
     * Inverse of {@link HexagonalGrid#cubeToOffset}.
     * @see {@link https://www.redblobgames.com/grids/hexagons/}
     * @param   offset  The offset coordinates
     * @returns         The integer cube coordinates
     */
    offsetToCube(offset: GridOffset2D): HexagonalGridCube2D;
    offsetToCube(offset: GridOffset3D): HexagonalGridCube3D;

    /**
     * Convert integer cube coordinates (q, r, s) into offset coordinates (i, j).
     * Inverse of {@link HexagonalGrid#offsetToCube}.
     * @see {@link https://www.redblobgames.com/grids/hexagons/}
     * @param   cube    The cube coordinates
     * @returns         The offset coordinates
     */
    cubeToOffset(cube: HexagonalGridCube2D): GridOffset2D;
    cubeToOffset(cube: HexagonalGridCube3D): GridOffset3D;

    /**
     * Measure the distance in hexagons between two cube coordinates.
     * @see {@link https://www.redblobgames.com/grids/hexagons/}
     * @param   a    The first cube coordinates
     * @param   b    The second cube coordinates
     * @returns      The distance between the two cube coordinates in hexagons
     */
    static cubeDistance(a: HexagonalGridCube2D, b: HexagonalGridCube2D): GridOffset2D;
    static cubeDistance(a: HexagonalGridCube3D, b: HexagonalGridCube3D): GridOffset3D;
}

export interface HexagonalGrid extends BaseGrid {
    get isGridless(): false;
    get isHexagonal(): true;
    get isSquare(): false;
}
