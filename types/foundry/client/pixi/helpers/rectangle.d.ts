/** A PIXI.Rectangle where the width and height are always positive and the x and y are always the top-left */
declare class NormalizedRectangle extends PIXI.Rectangle {
    constructor(x: number, y: number, width: number, height: number);

    /**
     * Determine whether some other Rectangle intersects with this one.
     * @param other Some other rectangle against which to compare
     * @returns Do the rectangles intersect?
     */
    intersects(other: PIXI.Rectangle): boolean;

    /**
     * Generate a new rectangle by rotating this one clockwise about its center by a certain number of radians
     * @param radians The angle of rotation
     * @returns A new rotated rectangle
     */
    rotate(radians: number): NormalizedRectangle;

    /**
     * Create normalized rectangular bounds given a rectangle shape and an angle of central rotation.
     * @param x       The top-left x-coordinate of the un-rotated rectangle
     * @param y       The top-left y-coordinate of the un-rotated rectangle
     * @param width   The width of the un-rotated rectangle
     * @param height  The height of the un-rotated rectangle
     * @param radians The angle of rotation about the center
     * @returns The constructed rotated rectangle bounds
     */
    static fromRotation(x: number, y: number, width: number, height: number, radians: number): NormalizedRectangle;
}
