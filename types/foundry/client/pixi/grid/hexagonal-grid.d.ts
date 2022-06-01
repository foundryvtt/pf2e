declare class HexagonalGrid extends BaseGrid {
    override draw(preview?: { gridColor?: string | null; gridAlpha?: string | null }): this;

    /**
     * A convenience method for getting all the polygon points relative to a top-left [x,y] coordinate pair
     * @param x   The top-left x-coordinate
     * @param y   The top-right y-coordinate
     * @param [w] An optional polygon width
     * @param [h] An optional polygon height
     */
    getPolygon(x: number, y: number, w?: number, h?: number): number[];
}
