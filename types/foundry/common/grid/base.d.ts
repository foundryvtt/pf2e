/** The base grid class. */
export abstract class BaseGrid {
    /** The size of a grid space in pixels. */
    size: number;

    /** The width of a grid space in pixels. */
    sizeX: number;

    /** The height of a grid space in pixels. */
    sizeY: number;

    /** The distance of a grid space in units. */
    distance: number;

    /** The distance units used in this grid. */
    units: string;

    /** The style of the grid. */
    style: string;

    /** The thickness of the grid. */
    thickness: number;

    /** The color of the grid. */
    color: Color;

    /** The opacity of the grid. */
    alpha: number;

    /**
     * The base grid constructor.
     * @param {GridConfiguration} config        The grid configuration
     */
    constructor(config: GridConfiguration);

    /** The grid type (see {@link CONST.GRID_TYPES}). */
    type: GridType;

    /** Is this a gridless grid? */
    get isGridless(): boolean;

    /** Is this a square grid? */
    get isSquare(): boolean;

    /** Is this a hexagonal grid? */
    get isHexagonal(): boolean;

    /**
     * Calculate the total size of the canvas with padding applied, as well as the top-left coordinates of the inner
     * rectangle that houses the scene.
     * @param sceneWidth         The width of the scene.
     * @param sceneHeight        The height of the scene.
     * @param padding            The percentage of padding.
     */
    abstract calculateDimensions(
        sceneWidth: number,
        sceneHeight: number,
        padding: number,
    ): { width: number; height: number; x: number; y: number; rows: number; columns: number };

    /**
     * Returns the offset of the grid space corresponding to the given coordinates.
     * @param    coords    The coordinates
     * @returns            The offset
     */
    abstract getOffset(coords: GridCoordinates): GridOffset;

    /**
     * Returns the smallest possible range containing the offsets of all grid spaces that intersect the given bounds.
     * If the bounds are empty (nonpositive width or height), then the offset range is empty.
     * @example
     * ```js
     * const [i0, j0, i1, j1] = grid.getOffsetRange(bounds);
     * for ( let i = i0; i < i1; i++ ) {
     *   for ( let j = j0; j < j1; j++ ) {
     *     const offset = {i, j};
     *     // ...
     *   }
     * }
     * ```
     * @param   bounds    The bounds
     * @returns           The offset range as [i0, j0, i1, j1]
     */
    abstract getOffsetRange(bounds: Rectangle): [number, number, number, number];

    /**
     * Returns the offsets of the grid spaces adjacent to the one corresponding to the given coordinates.
     * Returns an empty array in gridless grids.
     * @param     coords    The coordinates
     * @returns             The adjacent offsets
     */
    abstract getAdjacentOffsets(coords: GridCoordinates): GridOffset[];

    /**
     * Returns true if the grid spaces corresponding to the given coordinates are adjacent to each other.
     * In square grids with illegal diagonals the diagonally neighboring grid spaces are not adjacent.
     * Returns false in gridless grids.
     * @param    coords1    The first coordinates
     * @param    coords2    The second coordinates
     */
    abstract testAdjacency(coords1: GridCoordinates, coords2: GridCoordinates): boolean;

    /**
     * Returns the offset of the grid space corresponding to the given coordinates
     * shifted by one grid space in the given direction.
     * In square grids with illegal diagonals the offset of the given coordinates is returned
     * if the direction is diagonal.
     * @param coords The coordinates
     * @param direction The direction (see {@link CONST.MOVEMENT_DIRECTIONS})
     * @returns The offset
     */
    abstract getShiftedOffset(coords: GridCoordinates, direction: MovementDirection): GridOffset;

    /**
     * Returns the point shifted by the difference between the grid space corresponding to the given coordinates
     * and the shifted grid space in the given direction.
     * In square grids with illegal diagonals the point is not shifted if the direction is diagonal.
     * In gridless grids the point coordinates are shifted by the grid size.
     * @param  point     The point that is to be shifted
     * @param  direction The direction (see {@link CONST.MOVEMENT_DIRECTIONS})
     * @returns The shifted point
     */
    abstract getShiftedPoint(point: Point, direction: MovementDirection): Point;

    /**
     * Returns the top-left point of the grid space corresponding to the given coordinates.
     * If given a point, the top-left point of the grid space that contains it is returned.
     * In gridless grids a point with the same coordinates as the given point is returned.
     * @param coords The coordinates
     * @returns The top-left point
     */
    abstract getTopLeftPoint(coords: GridCoordinates): Point;

    /**
     * Returns the center point of the grid space corresponding to the given coordinates.
     * If given a point, the center point of the grid space that contains it is returned.
     * In gridless grids a point with the same coordinates as the given point is returned.
     * @param coords The coordinates
     * @returns The center point
     */
    abstract getCenterPoint(coords: GridCoordinates): Point;

    /**
     * Returns the points of the grid space shape relative to the center point.
     * The points are returned in the same order as in {@link BaseGrid#getVertices}.
     * In gridless grids an empty array is returned.
     * @returns   The points of the polygon
     */
    abstract getShape(): Point[];

    /**
     * Returns the vertices of the grid space corresponding to the given coordinates.
     * The vertices are returned ordered in positive orientation with the first vertex
     * being the top-left vertex in square grids, the top vertex in row-oriented
     * hexagonal grids, and the left vertex in column-oriented hexagonal grids.
     * In gridless grids an empty array is returned.
     * @param   coords    The coordinates
     * @returns           The vertices
     */
    abstract getVertices(coords: GridCoordinates): Point[];

    /**
     * Snaps the given point to the grid.
     * @param   point    The point that is to be snapped
     * @param   behavior The snapping behavior
     * @returns The snapped point
     */
    abstract getSnappedPoint(point: Point, behavior: GridSnappingBehavior): Point;

    /**
     * Measure a shortest, direct path through the given waypoints.
     * @param waypoints         The waypoints the path must pass through
     * @param [options]         Additional measurement options
     * @param [options.cost]    The function that returns the cost for a given move between grid spaces
     *                          (default is the distance travelled along the direct path)
     * @returns                 The measurements a shortest, direct path through the given waypoints.
     */
    measurePath(
        waypoints: GridMeasurePathWaypoint[],
        options?: { cost?: GridMeasurePathCostFunction },
    ): GridMeasurePathResult;

    /**
     * Measures the path and writes the measurements into `result`.
     * Called by {@link BaseGrid#measurePath}.
     * @param waypoints         The waypoints the path must pass through
     * @param options           Additional measurement options
     * @param [options.cost]    The function that returns the cost for a given move between grid spaces
     *                          (default is the distance travelled)
     * @param result            The measurement result that the measurements need to be written to
     */
    protected abstract _measurePath(
        waypoints: GridMeasurePathWaypoint[],
        options: { cost?: GridMeasurePathCostFunction },
        result: GridMeasurePathResult,
    ): void;

    /**
     * Returns the sequence of grid offsets of a shortest, direct path passing through the given waypoints.
     * @param waypoints The waypoints the path must pass through
     * @returns The sequence of grid offsets of a shortest, direct path
     */
    abstract getDirectPath(waypoints: GridMeasurePathWaypoint[]): GridOffset[];

    /**
     * Get the point translated in a direction by a distance.
     * @param   point        The point that is to be translated.
     * @param   direction    The angle of direction in degrees.
     * @param   distance     The distance in grid units.
     * @returns              The translated point.
     */
    abstract getTranslatedPoint(point: Point, direction: number, distance: number): Point;

    /**
     * Get the circle polygon given the radius in grid units for this grid.
     * The points of the polygon are returned ordered in positive orientation.
     * In gridless grids an approximation of the true circle with a deviation of less than 0.25 pixels is returned.
     * @param   center    The center point of the circle.
     * @param   radius    The radius in grid units.
     * @returns           The points of the circle polygon.
     */
    abstract getCircle(center: Point, radius: number): Point[];

    /**
     * Get the cone polygon given the radius in grid units and the angle in degrees for this grid.
     * The points of the polygon are returned ordered in positive orientation.
     * In gridless grids an approximation of the true cone with a deviation of less than 0.25 pixels is returned.
     * @param   origin       The origin point of the cone.
     * @param   radius       The radius in grid units.
     * @param   direction    The direction in degrees.
     * @param   angle        The angle in degrees.
     * @returns              The points of the cone polygon.
     */
    getCone(origin: Point, radius: number, direction: number, angle: number): Point[];
}

declare global {
    interface GridConfiguration {
        /** The size of a grid space in pixels (a positive number) */
        size: number;
        /** The distance of a grid space in units (a positive number) */
        distance?: number;
        /** The units of measurement */
        units?: string;
        /** The style of the grid */
        style?: string;
        /** The color of the grid */
        color?: ColorSource;
        /** The alpha of the grid */
        alpha?: number;
        /** The line thickness of the grid */
        thickness?: number;
    }

    /** A pair of row and column coordinates of a grid space. */
    interface GridOffset {
        /** The row coordinate */
        i: number;
        /** The column coordinate */
        j: number;
    }

    /** An offset of a grid space or a point with pixel coordinates. */
    type GridCoordinates = GridOffset | Point;

    /** Snapping behavior is defined by the snapping mode at the given resolution of the grid. */
    interface GridSnappingBehavior {
        /** The snapping mode (a union of {@link CONST.GRID_SNAPPING_MODES}) */
        mode: number;
        /** The resolution (a positive integer) */
        resolution?: number;
    }

    type GridMeasurePathWaypoint = GridCoordinates & { teleport?: boolean };

    /** The measurements of a waypoint. */
    interface GridMeasurePathResultWaypoint {
        /** The segment from the previous waypoint to this waypoint. */
        backward: GridMeasurePathResultSegment | null;
        /** The segment from this waypoint to the next waypoint. */
        forward: GridMeasurePathResultSegment | null;
        /** The total distance travelled along the path up to this waypoint. */
        distance: number;
        /** The total number of spaces moved along a direct path up to this waypoint. */
        spaces: number;
        /** The total cost of the direct path ({@link BaseGrid#getDirectPath}) up to this waypoint. */
        cost: number;
    }

    /** The measurements of a segment. */
    interface GridMeasurePathResultSegment {
        /** The waypoint that this segment starts from. */
        from: GridMeasurePathResultWaypoint;
        /** The waypoint that this segment goes to. */
        to: GridMeasurePathResultWaypoint;
        /** Is teleporation? */
        teleport: boolean;
        /** The distance travelled in grid units along this segment. */
        distance: number;
        /** The number of spaces moved along this segment. */
        spaces: number;
        /** The cost of the direct path ({@link BaseGrid#getDirectPath}) between the two waypoints. */
        cost: number;
    }

    /** The measurements result of {@link BaseGrid#measurePath}. */
    interface GridMeasurePathResult {
        /** The measurements at each waypoint. */
        waypoints: GridMeasurePathResultWaypoint[];
        /** The measurements at each segment. */
        segments: GridMeasurePathResultSegment[];
        /** The total distance travelled along the path through all waypoints. */
        distance: number;
        /** The total number of spaces moved along a direct path through all waypoints.
         *  Moving from a grid space to any of its neighbors counts as 1 step.
         *  Always 0 in gridless grids. */
        spaces: number;
        /** The total cost of the direct path ({@link BaseGrid#getDirectPath}) through all waypoints. */
        cost: number;
    }

    /**
     * A function that returns the cost for a given move between grid spaces.
     * In square and hexagonal grids the grid spaces are always adjacent unless teleported.
     * The distance is 0 if and only if teleported. The function is never called with the same offsets.
     * @param    from      The offset that is moved from.
     * @param    to        The offset that is moved to.
     * @param    distance  The distance between the grid spaces, or 0 if teleported.
     * @returns            The cost of the move between the grid spaces.
     */
    type GridMeasurePathCostFunction = (from: GridOffset, to: GridOffset, distance: number) => number;
}
