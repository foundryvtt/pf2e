export {};

declare global {
    /** A CanvasLayer responsible for drawing a square grid */
    class GridLayer extends CanvasLayer {
        grid: BaseGrid;

        highlight: PIXI.Container;

        highlightLayers: Record<string, PIXI.Graphics>;

        static override get layerOptions(): GridLayerOptions;

        /** The grid type rendered in this Scene */
        get type(): GridType;

        /** A convenient reference to the pixel grid size used throughout this layer */
        get size(): number;

        /** Get grid unit width */
        get w(): number;

        /** Get grid unit height */
        get h(): number;

        /** A boolean flag for whether the current grid is hexagonal */
        get isHex(): boolean;

        /**
         * Draw the grid
         * @param preview Override settings used in place of those saved to the Scene data
         */
        draw({ type, dimensions, gridColor, gridAlpha }?: GridDrawOptions): Promise<this>;

        /**
         * Given a pair of coordinates (x1,y1), return the grid coordinates (x2,y2) which represent the snapped position
         * @param x The exact target location x
         * @param y The exact target location y
         * @param [interval=1]  An interval of grid spaces at which to snap, default is 1. If the interval is zero, no snapping occurs.
         */
        getSnappedPosition(x: number, y: number, interval?: number): Point;

        /**
         * Given a pair of coordinates (x, y) - return the top-left of the grid square which contains that point
         * @return An Array [x, y] of the top-left coordinate of the square which contains (x, y)
         */
        getTopLeft(x: number, y: number): PointArray;

        /**
         * Given a pair of coordinates (x, y), return the center of the grid square which contains that point
         * @return An Array [x, y] of the central point of the square which contains (x, y)
         */
        getCenter(x: number, y: number): PointArray;

        /**
         * Measure the grid-wise distance between two point coordinates.
         * @param origin The origin point
         * @param target The target point
         * @return The measured distance between these points
         *
         * @example
         * let distance = canvas.grid.measureDistance({x: 1000, y: 1000}, {x: 2000, y: 2000});
         */
        measureDistance(origin: Point, target: Point): number;

        /**
         * Measure the distance traveled over an array of distance segments.
         * @param segments An array of measured segments
         * @param options  Additional options which modify the measurement
         */
        measureDistances(segments: Segment[], options?: Record<string, unknown>): number[];

        /* -------------------------------------------- */
        /*  Grid Highlighting Methods                   */
        /* -------------------------------------------- */

        /**
         * Define a new Highlight graphic
         * @param name The name for the referenced highlight layer
         */
        addHighlightLayer(name: string): PIXI.Graphics | undefined;

        /**
         * Clear a specific Highlight graphic
         * @param name The name for the referenced highlight layer
         */
        clearHighlightLayer(name: string): void;

        /**
         * Destroy a specific Highlight graphic
         * @param name The name for the referenced highlight layer
         */
        destroyHighlightLayer(name: string): void;

        /**
         * Obtain the highlight layer graphic by name
         * @param name The name for the referenced highlight layer
         */
        getHighlightLayer(name: string): GridHighlight | undefined;

        /**
         * Add highlighting for a specific grid position to a named highlight graphic
         * @param name    The name for the referenced highlight layer
         * @param options Options for the grid position that should be highlighted
         */
        highlightPosition(name: string, options: Record<string, unknown>): void;

        /**
         * Test if a specific row and column position is a neighboring location to another row and column coordinate
         * @param r0 The original row position
         * @param c0 The original column position
         * @param r1 The candidate row position
         * @param c1 The candidate column position
         */
        isNeighbor(r0: number, c0: number, r1: number, c1: number): boolean;
    }

    interface GridDrawOptions {
        type?: GridType | null;
        dimensions?: CanvasDimensions | null;
        gridColor?: string | null;
        gridAlpha?: number | null;
    }
}

interface GridLayerOptions extends CanvasLayerOptions {
    name: "grid";
}
