/**
 * Construct a square grid container
 */
declare class SquareGrid extends BaseGrid {
    override draw(preview?: { gridColor?: string | null; gridAlpha?: string | null }): this;
}
