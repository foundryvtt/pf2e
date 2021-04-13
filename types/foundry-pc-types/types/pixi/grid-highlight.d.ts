/**
 * A special Graphics class which handles Grid layer highlighting
 */
declare class GridHighlight extends PIXI.Graphics {
    constructor(name: string, geometry?: PIXI.GraphicsGeometry);

    /**
     * Track the Grid Highlight name
     */
    name: string;

    /**
     * Track distinct positions which have already been highlighted
     */
    positions: Set<`${number}.${number}`>;

    /**
     * Record a position that is highlighted and return whether or not it should be rendered
     * @param x The x-coordinate to highlight
     * @param y The y-coordinate to highlight
     * @return Whether or not to draw the highlight for this location
     */
    highlight(x: number, y: number): boolean;

    /**
     * Extend the Graphics clear logic to also reset the highlighted positions
     * @param args
     */
    clear(...args: number[]): void;

    /**
     * Extend how this Graphics container is destroyed to also remove parent layer references
     * @param args
     */
    destroy(options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }): void;
}
