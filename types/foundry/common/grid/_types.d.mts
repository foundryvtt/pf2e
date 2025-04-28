import { GridDiagonal, GridSnappingMode } from "@common/constants.mjs";
import { ColorSource, DeepReadonly, ElevatedPoint, Point } from "../_types.mjs";

/**
 * 2D offset coordinates of a grid space.
 */
export interface GridOffset2D {
    /** The row coordinate (an integer) */
    i: number;
    /** The column coordinate (an integer) */
    j: number;
}

/**
 * 3D offset coordinates of a grid space.
 */
export interface GridOffset3D {
    /** The row coordinate (an integer) */
    i: number;
    /** The column coordinate (an integer) */
    j: number;
    /** The vertical coordinate (an integer) */
    k: number;
}

/**
 * 2D cube coordinates in a hexagonal grid. q + r + s = 0.
 */
export interface HexagonalGridCube2D {
    /**
     * The coordinate along the E-W (columns) or SW-NE (rows) axis. Equal to the offset column coordinate if column
     * orientation.
     */
    q: number;
    /**
     * The coordinate along the NE-SW (columns) or N-S (rows) axis. Equal to the offset row coordinate if row
     * orientation.
     */
    r: number;
    /** The coordinate along the SE-NW axis. */
    s: number;
}

/**
 * 3D cube coordinates in a hexagonal grid. q + r + s = 0.
 */
export interface HexagonalGridCube3D extends HexagonalGridCube2D {
    /** The vertical coordinate. */
    k: number;
}

/**
 * A 2D offset of a grid space or a 2D point with pixel coordinates.
 */
export type GridCoordinates2D = GridOffset2D | Point;

/**
 * A 3D offset of a grid space or an elevated point.
 */
export type GridCoordinates3D = GridOffset3D | ElevatedPoint;

/**
 * 2D hexagonal cube coordinates, a 2D offset of a grid space, or a 2D point with pixel coordinates.
 */
export type HexagonalGridCoordinates2D = GridCoordinates2D | HexagonalGridCube2D;

/**
 * 3D hexagonal cube coordinates, a 3D offset of a grid space, or a 3D point with pixel coordinates.
 */
export type HexagonalGridCoordinates3D = GridCoordinates3D | HexagonalGridCube3D;

/**
 * A snapping behavior is defined by the snapping mode at the given resolution of the grid.
 */
export interface GridSnappingBehavior {
    /** The snapping mode (a union of {@link CONST.GRID_SNAPPING_MODES}). */
    mode: GridSnappingMode;
    /**
     * The resolution (a positive integer).
     * @default 1
     */
    resolution?: number;
}

export interface GridMeasurePathWaypointData2D {
    /**
     * Teleport to this waypoint?
     * @default false
     */
    teleport?: boolean;
    /** A predetermined cost (nonnegative) or cost function to be used instead of `options.cost`. */
    cost?: number | GridMeasurePathCostFunction2D;
}

export interface GridMeasurePathWaypointData3D {
    /**
     * Teleport to this waypoint?
     * @default false
     */
    teleport?: boolean;
    /** A predetermined cost (nonnegative) or cost function to be used instead of `options.cost`. */
    cost?: number | GridMeasurePathCostFunction3D;
}

/**
 * A waypoint of {@link GridMeasurePathResult}.
 */
export interface GridMeasurePathResult {
    waypoints: GridMeasurePathResultWaypoint[];
    segments: GridMeasurePathResultSegment[];
    distance: number;
    cost: number;
    spaces: number;
    diagonals: number;
}

/**
 * A function that returns the cost for a given move between grid spaces in 2D.
 * In square and hexagonal grids the grid spaces are always adjacent unless teleported.
 * The distance is 0 if and only if teleported. The function is never called with the same offsets.
 * @param from     The offset that is moved from
 * @param to       The offset that is moved to
 * @param distance The distance between the grid spaces, or 0 if teleported
 * @param segment  The properties of the segment
 * @returns The cost of the move between the grid spaces (nonnegative)
 */
export type GridMeasurePathCostFunction2D<TSegmentData extends object = object> = (
    from: Readonly<GridOffset2D>,
    to: Readonly<GridOffset2D>,
    distance: number,
    segment: DeepReadonly<TSegmentData>,
) => number;

/**
 * A function that returns the cost for a given move between grid spaces in 3D.
 * In square and hexagonal grids the grid spaces are always adjacent unless teleported.
 * The distance is 0 if and only if teleported. The function is never called with the same offsets.
 * @param from     The offset that is moved from
 * @param to       The offset that is moved to
 * @param distance The distance between the grid spaces, or 0 if teleported
 * @param segment  The properties of the segment
 * @returns The cost of the move between the grid spaces (nonnegative)
 */
export type GridMeasurePathCostFunction3D<TSegmentData extends object = object> = (
    from: Readonly<GridOffset3D>,
    to: Readonly<GridOffset3D>,
    distance: number,
    segment: DeepReadonly<TSegmentData>,
) => number;

export interface GridConfiguration {
    /** The size of a grid space in pixels (a positive number). */
    size: number;
    /**
     * The distance of a grid space in units (a positive number).
     * @default 1
     */
    distance?: number;
    /**
     * The units of measurement.
     * @default ""
     */
    units?: string;
    /**
     * The style of the grid.
     * @default "solidLines"
     */
    style?: string;
    /**
     * The color of the grid.
     * @default 0x000000
     */
    color?: ColorSource;
    /**
     * The alpha of the grid.
     * @default 1
     */
    alpha?: number;
    /**
     * The line thickness of the grid.
     * @default 1
     */
    thickness?: number;
}

interface SquareGridConfiguration extends GridConfiguration {
    /**
     * The rule for diagonal measurement (see {@link CONST.GRID_DIAGONALS}).
     * @default CONST.GRID_DIAGONALS.EQUIDISTANT
     */
    diagonals?: GridDiagonal;
}

interface HexagonalGridConfiguration extends SquareGridConfiguration {
    /**
     * Is this grid column-based (flat-topped) or row-based (pointy-topped)?
     * @default false
     */
    columns?: boolean;
    /**
     * Is this grid even or odd?
     * @default false
     */
    even?: boolean;
}
