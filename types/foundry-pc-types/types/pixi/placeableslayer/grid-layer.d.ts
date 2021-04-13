/**
 * A CanvasLayer responsible for drawing a square grid
 */
declare class GridLayer extends PlaceablesLayer {
    /**
     * The Grid container
     */
    grid: PIXI.Container;

    /**
     * The Grid Highlight container
     */
    highlight: PIXI.Container;

    /**
     * Map named highlight layers
     */
    highlightLayers: Record<string, GridHighlight>;

    /**
     * The grid type rendered in this Scene
     */
    get type(): number;

    /**
     * A convenient reference to the pixel grid size used throughout this layer
     */
    get size(): number;

    /**
     * Given a pair of coordinates (x1,y1), return the grid coordinates (x2,y2) which represent the snapped position
     * @param x        The exact target location x
     * @param y        The exact target location y
     * @param interval An interval of grid spaces at which to snap, default is 1.
     */
    getSnappedPosition(x: number, y: number, interval: number): { x: number; y: number };

    getHighlightLayer(name: string): GridHighlight | undefined;

}
