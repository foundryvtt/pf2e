/**
 * The base grid class.
 * This double-dips to implement the "gridless" option
 */
declare class BaseGrid extends PIXI.Container {
    constructor(options);
  
    /* -------------------------------------------- */
 
    draw();
  
    /* -------------------------------------------- */
  
    /**
     * Highlight a grid position for a certain coordinates
     * @param {GridHighlight} layer The highlight layer to use
     * @param {Number} x            The x-coordinate of the highlighted position
     * @param {Number} y            The y-coordinate of the highlighted position
     * @param {Number} color        The hex fill color of the highlight
     * @param {Number} border       The hex border color of the highlight
     * @param {Number} alpha        The opacity of the highlight
     */
    highlightGridPosition(layer: object, data: {x?: number, y?: number, color?: number, border?: number, alpha?: number});
  
    /* -------------------------------------------- */
    /*  Grid Measurement Methods
    /* -------------------------------------------- */
  
    /**
     * Given a pair of coordinates (x, y) - return the top-left of the grid square which contains that point
     * @return {Array}    An Array [x, y] of the top-left coordinate of the square which contains (x, y)
     */
    getTopLeft(x: number, y: number): number[];
  
    /* -------------------------------------------- */
  
    /**
     * Given a pair of coordinates (x, y), return the center of the grid square which contains that point
     * @return {Array}    An Array [x, y] of the central point of the square which contains (x, y)
     */
    getCenter(x: number, y: number): number[];
  
    /* -------------------------------------------- */
  
    /**
     * Given a pair of coordinates (x1,y1), return the grid coordinates (x2,y2) which represent the snapped position
     * Under a "gridless" system, every pixel position is a valid snapping position
     *
     * @param {Number} x          The exact target location x
     * @param {Number} y          The exact target location y
     * @param {Number} interval   An interval of grid spaces at which to snap, default is 1
     *
     * @return {{x, y}}           An object containing the coordinates of the snapped location
     */
    getSnappedPosition(x: number, y: number, interval: number): { x: number, y: number };
  
    /* -------------------------------------------- */
  
  
    /**
     * Given a pair of pixel coordinates, return the grid position as an Array.
     * Always round down to the nearest grid position so the pixels are within the grid space (from top-left).
     * @param {number} x    The x-coordinate pixel position
     * @param {number} y    The y-coordinate pixel position
     * @return {number[]}   An array representing the position in grid units
     */
    getGridPositionFromPixels(x: number, y: number): number[];
  
    /* -------------------------------------------- */
  
    /**
     * Given a pair of grid coordinates, return the pixel position as an Array.
     * Always round up to a whole pixel so the pixel is within the grid space (from top-left).
     * @param {number} x    The x-coordinate grid position
     * @param {number} y    The y-coordinate grid position
     * @return {number[]}   An array representing the position in pixels
     */
    getPixelsFromGridPosition(x: number, y: number): number[];
  
    /* -------------------------------------------- */
  
    /**
     * Shift a pixel position [x,y] by some number of grid units dx and dy
     * @param {Number} x    The starting x-coordinate in pixels
     * @param {Number} y    The starting y-coordinate in pixels
     * @param {Number} dx   The number of grid positions to shift horizontally
     * @param {Number} dy   The number of grid positions to shift vertically
     */
    shiftPosition(x: number, y: number, dx: number, dy: number): number[];
  
    /* -------------------------------------------- */
  
    /**
     * Measure the distance traversed over an array of measured segments
     * @param {object[]} segments     An Array of measured movement segments
     * @param {Options} options       Additional options which modify the measurement
     * @return {number[]}             An Array of distance measurements for each segment
     */
    measureDistances(segments: object[], options: object): number[]
  
    /* -------------------------------------------- */
  
    /**
     * Get the grid row and column positions which are neighbors of a certain position
     * @param {Number} row  The grid row coordinate against which to test for neighbors
     * @param {Number} col  The grid column coordinate against which to test for neighbors
     * @return {Array}      An array of grid positions which are neighbors of the row and column
     */
    getNeighbors(row: number, col: number): number[]
}