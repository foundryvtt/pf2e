export {};

declare global {
    /**
     * The base grid class.
     * This double-dips to implement the "gridless" option
     */
    abstract class BaseGrid extends PIXI.Container {
        constructor(options: BaseGridOptions);

        options: BaseGridOptions;

        /** Grid Unit Width */
        w: number;

        /** Grid Unit Height */
        h: number;

        /** Highlight active grid spaces */
        highlight: PIXI.Container;

        /**
         * Draw the grid. Subclasses are expected to override this method to perform their type-specific drawing logic.
         * @param [preview] Override settings used in place of those saved to the scene data.
         * @param [preview.gridColor=null] The grid color.
         * @param [preview.gridAlpha=null] The grid transparency.
         */
        draw(preview?: { gridColor?: string | null; gridAlpha?: string | null }): this;

        /**
         * Highlight a grid position for a certain coordinates
         * @param layer  The highlight layer to use
         * @param x      The x-coordinate of the highlighted position
         * @param y      The y-coordinate of the highlighted position
         * @param color  The hex fill color of the highlight
         * @param border The hex border color of the highlight
         * @param alpha  The opacity of the highlight
         */
        highlightGridPosition(
            layer: GridHighlight,
            data?: { x?: number; y?: number; color?: number; border?: number; alpha?: number }
        ): this;

        /* -------------------------------------------- */
        /*  Grid Measurement Methods
        /* -------------------------------------------- */

        /**
         * Given a pair of coordinates (x, y) - return the top-left of the grid square which contains that point
         * @return    An Array [x, y] of the top-left coordinate of the square which contains (x, y)
         */
        getTopLeft(x: number, y: number): number[];

        /* -------------------------------------------- */

        /**
         * Given a pair of coordinates (x, y), return the center of the grid square which contains that point
         * @return    An Array [x, y] of the central point of the square which contains (x, y)
         */
        getCenter(x: number, y: number): number[];

        /* -------------------------------------------- */

        /**
         * Given a pair of coordinates (x1,y1), return the grid coordinates (x2,y2) which represent the snapped position
         * Under a "gridless" system, every pixel position is a valid snapping position
         *
         * @param x The exact target location x
         * @param y The exact target location y
         * @param interval An interval of grid spaces at which to snap, default is 1
         *
         * @return  An object containing the coordinates of the snapped location
         */
        getSnappedPosition(x: number, y: number, interval: number): { x: number; y: number };

        /* -------------------------------------------- */

        /**
         * Given a pair of pixel coordinates, return the grid position as an Array.
         * Always round down to the nearest grid position so the pixels are within the grid space (from top-left).
         * @param x The x-coordinate pixel position
         * @param y The y-coordinate pixel position
         * @return  An array representing the position in grid units
         */
        getGridPositionFromPixels(x: number, y: number): number[];

        /* -------------------------------------------- */

        /**
         * Given a pair of grid coordinates, return the pixel position as an Array.
         * Always round up to a whole pixel so the pixel is within the grid space (from top-left).
         * @param x The x-coordinate grid position
         * @param y The y-coordinate grid position
         * @return An array representing the position in pixels
         */
        getPixelsFromGridPosition(x: number, y: number): number[];

        /* -------------------------------------------- */

        /**
         * Shift a pixel position [x,y] by some number of grid units dx and dy
         * @param x    The starting x-coordinate in pixels
         * @param y    The starting y-coordinate in pixels
         * @param dx   The number of grid positions to shift horizontally
         * @param dy   The number of grid positions to shift vertically
         */
        shiftPosition(x: number, y: number, dx: number, dy: number): number[];

        /* -------------------------------------------- */

        /**
         * Measure the distance traversed over an array of measured segments
         * @param segments  An Array of measured movement segments
         * @param options   Additional options which modify the measurement
         * @return  An Array of distance measurements for each segment
         */
        measureDistances(segments: Segment[], options: MeasureDistancesOptions): number[];

        /* -------------------------------------------- */

        /**
         * Get the grid row and column positions which are neighbors of a certain position
         * @param row  The grid row coordinate against which to test for neighbors
         * @param col  The grid column coordinate against which to test for neighbors
         * @return      An array of grid positions which are neighbors of the row and column
         */
        getNeighbors(row: number, col: number): number[];
    }

    interface BaseGridOptions {
        dimensions: {
            size: number;
        };
    }

    interface Segment {
        ray: Ray;
        label: PIXI.Container;
    }

    interface MeasureDistancesOptions {
        gridSpaces?: boolean;
    }
}
