import type { BaseGrid } from "./base.d.ts";

/** The hexagonal grid class. */
export class HexagonalGrid extends BaseGrid {
    override type:
        | typeof CONST.GRID_TYPES.HEXEVENQ
        | typeof CONST.GRID_TYPES.HEXODDQ
        | typeof CONST.GRID_TYPES.HEXEVENR
        | typeof CONST.GRID_TYPES.HEXODDR;

    /** Is this grid column-based (flat-topped) or row-based (pointy-topped)? */
    columns: boolean;

    /** Is this grid even or odd? */
    even: boolean;

    /** The hexagonal grid constructor. */
    constructor(config: HexagonalGridConfiguration);

    override getOffset(coords: HexagonalGridCoordinates): GridOffset;

    override getOffsetRange(bounds: Rectangle): [number, number, number, number];

    override getAdjacentOffsets(coords: HexagonalGridCoordinates): GridOffset[];

    override testAdjacency(coords1: HexagonalGridCoordinates, coords2: HexagonalGridCoordinates): boolean;

    override getShiftedOffset(coords: HexagonalGridCoordinates, direction: MovementDirection): GridOffset;

    override getShiftedPoint(point: Point, direction: MovementDirection): Point;

    /**
     * Returns the cube coordinates of the grid space corresponding to the given coordinates.
     * @param   coords    The coordinates
     * @returns           The cube coordinates
     */
    getCube(coords: HexagonalGridCoordinates): HexagonalGridCube;

    /**
     * Returns the cube coordinates of grid spaces adjacent to the one corresponding to the given coordinates.
     * @param   coords   The coordinates
     * @returns          The adjacent cube coordinates
     */
    getAdjacentCubes(coords: HexagonalGridCoordinates): HexagonalGridCube[];

    /**
     * Returns the cube coordinates of the grid space corresponding to the given coordinates
     * shifted by one grid space in the given direction.
     * @param  coords    The coordinates
     * @param  direction The direction (see {@link CONST.MOVEMENT_DIRECTIONS})
     */
    getShiftedCube(coords: HexagonalGridCoordinates, direction: MovementDirection): HexagonalGridCube;

    override getTopLeftPoint(coords: HexagonalGridCoordinates): Point;

    override getCenterPoint(coords: HexagonalGridCoordinates): Point;

    override getShape(): Point[];

    override getVertices(coords: HexagonalGridCoordinates): Point[];

    override getSnappedPoint(point: Point, behavior: GridSnappingBehavior): Point;

    override calculateDimensions(
        sceneWidth: number,
        sceneHeight: number,
        padding: number,
    ): { width: number; height: number; x: number; y: number; rows: number; columns: number };

    protected override _measurePath(
        waypoints: GridMeasurePathWaypoint[],
        options: { cost?: GridMeasurePathCostFunction },
        result: GridMeasurePathResult,
    ): void;

    /** @see {@link https://www.redblobgames.com/grids/hexagons/#line-drawing} */
    override getDirectPath(waypoints: GridMeasurePathWaypoint[]): GridOffset[];

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
    static cubeRound(cube: HexagonalGridCube): HexagonalGridCube;

    /**
     * Convert point coordinates (x, y) into cube coordinates (q, r, s).
     * Inverse of {@link HexagonalGrid#cubeToPoint}.
     * @see {@link https://www.redblobgames.com/grids/hexagons/}
     * @param   point   The point
     * @returns         The (fractional) cube coordinates
     */
    pointToCube(point: Point): HexagonalGridCube;

    /**
     * Convert cube coordinates (q, r, s) into point coordinates (x, y).
     * Inverse of {@link HexagonalGrid#pointToCube}.
     * @see {@link https://www.redblobgames.com/grids/hexagons/}
     * @param   cube    The cube coordinates
     * @returns         The point coordinates
     */
    cubeToPoint(cube: HexagonalGridCube): Point;

    /**
     * Convert offset coordinates (i, j) into integer cube coordinates (q, r, s).
     * Inverse of {@link HexagonalGrid#cubeToOffset}.
     * @see {@link https://www.redblobgames.com/grids/hexagons/}
     * @param   offset  The offset coordinates
     * @returns         The integer cube coordinates
     */
    offsetToCube(offset: GridOffset): HexagonalGridCube;

    /**
     * Convert integer cube coordinates (q, r, s) into offset coordinates (i, j).
     * Inverse of {@link HexagonalGrid#offsetToCube}.
     * @see {@link https://www.redblobgames.com/grids/hexagons/}
     * @param   cube    The cube coordinates
     * @returns         The offset coordinates
     */
    cubeToOffset(cube: HexagonalGridCube): GridOffset;

    /**
     * Measure the distance in hexagons between two cube coordinates.
     * @see {@link https://www.redblobgames.com/grids/hexagons/}
     * @param   a    The first cube coordinates
     * @param   b    The second cube coordinates
     * @returns      The distance between the two cube coordinates in hexagons
     */
    static cubeDistance(a: HexagonalGridCube, b: HexagonalGridCube): number;
}

export interface HexagonalGrid extends BaseGrid {
    get isGridless(): false;
    get isHexagonal(): true;
    get isSquare(): false;
}

declare global {
    interface HexagonalGridConfiguration extends GridConfiguration {
        /** Is this grid column-based (flat-topped) or row-based (pointy-topped)? Defaults to `false`. */
        columns?: boolean;
        /** Is this grid even or odd? Defaults to `false`. */
        even?: boolean;
    }

    /** Cube coordinates in a hexagonal grid. q + r + s = 0. */
    type HexagonalGridCube = {
        /** The coordinate along the E-W (columns) or SW-NE (rows) axis. Equal to the offset column coordinate if column orientation. */
        q: number;
        /** The coordinate along the NE-SW (columns) or N-S (rows) axis. Equal to the offset row coordinate if row orientation. */
        r: number;
        /** The coordinate along the SE-NW axis. */
        s: number;
    };

    /** Hex cube coordinates, an offset of a grid space, or a point with pixel coordinates. */
    type HexagonalGridCoordinates = GridCoordinates | HexagonalGridCube;
}
