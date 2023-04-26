/**
 * A representation of a color in hexadecimal format.
 * This class provides methods for transformations and manipulations of colors.
 */
export default class Color extends Number {
    /**
     * A CSS-compatible color string.
     * An alias for Color#toString.
     */
    get css(): string;

    /** The color represented as an RGB array. */
    get rgb(): [number, number, number];

    /** The numeric value of the red channel between [0, 1]. */
    get r(): number;

    /** The numeric value of the green channel between [0, 1]. */
    get g(): number;

    /** The numeric value of the blue channel between [0, 1]. */
    get b(): number;

    /** The maximum value of all channels. */
    get maximum(): number;

    /** The minimum value of all channels. */
    get minimum(): number;

    /** Get the value of this color in little endian format. */
    get littleEndian(): number;

    /**
     * The color represented as an HSV array.
     * Conversion formula adapted from http://en.wikipedia.org/wiki/HSV_color_space.
     * Assumes r, g, and b are contained in the set [0, 1] and returns h, s, and v in the set [0, 1].
     */
    get hsv(): [number, number, number];

    /* ------------------------------------------ */
    /*  Color Manipulation Methods                */
    /* ------------------------------------------ */

    override toString(radix?: number): HexColorString;

    /**
     * Test whether this color equals some other color
     * @param other Some other color or hex number
     * @returns Are the colors equal?
     */
    equals(other: Color | number): boolean;

    /**
     * Get a CSS-compatible RGBA color string.
     * @param alpha The desired alpha in the range [0, 1]
     * @returns A CSS-compatible RGBA string
     */
    toRGBA(alpha: number): string;

    /**
     * Mix this Color with some other Color using a provided interpolation weight.
     * @param other Some other Color to mix with
     * @param weight The mixing weight placed on this color where weight is placed on the other color
     * @returns The resulting mixed Color
     */
    mix(other: Color, weight: number): Color;

    /**
     * Multiply this Color by another Color or a static scalar.
     * @param other Some other Color or a static scalar.
     * @returns The resulting Color.
     */
    multiply(other: Color | number): Color;

    /**
     * Add this Color by another Color or a static scalar.
     * @param other Some other Color or a static scalar.
     * @returns The resulting Color.
     */
    add(other: Color | number): Color;

    /**
     * Subtract this Color by another Color or a static scalar.
     * @param other Some other Color or a static scalar.
     * @returns The resulting Color.
     */
    subtract(other: Color | number): Color;

    /**
     * Max this color by another Color or a static scalar.
     * @param other Some other Color or a static scalar.
     * @returns The resulting Color.
     */
    maximize(other: Color | number): Color;

    /**
     * Min this color by another Color or a static scalar.
     * @param other Some other Color or a static scalar.
     * @returns The resulting Color.
     */
    minimize(other: Color | number): Color;

    /* ------------------------------------------ */
    /*  Iterator                                  */
    /* ------------------------------------------ */

    /** Iterating over a Color is equivalent to iterating over its [r,g,b] color channels. */
    [Symbol.iterator](): Generator<number>;

    /* ------------------------------------------ */
    /*  Factory Methods                           */
    /* ------------------------------------------ */

    /**
     * Create a Color instance from an RGB array.
     * @param color A color input
     * @returns The hex color instance or NaN
     */
    static from(color: null | string | number | [number, number, number]): Color | number;

    /**
     * Create a Color instance from a color string which either includes or does not include a leading #.
     * @param color A color string
     * @returns The hex color instance
     */
    static fromString(color: string): Color;

    /**
     * Create a Color instance from an RGB array.
     * @param rgb An RGB tuple
     * @returns The hex color instance
     */
    static fromRGB(rgb: [number, number, number]): Color;

    /**
     * Create a Color instance from an HSV array.
     * Conversion formula adapted from http://en.wikipedia.org/wiki/HSV_color_space.
     * Assumes h, s, and v are contained in the set [0, 1].
     * @param hsv An HSV tuple
     * @returns The hex color instance
     */
    static fromHSV(hsv: [number, number, number]): Color;
}
