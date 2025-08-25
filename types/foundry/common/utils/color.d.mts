import { ColorSource } from "@common/_types.mjs";
import { HexColorString } from "@common/constants.mjs";

/**
 * A representation of a color in hexadecimal format.
 * This class provides methods for transformations and manipulations of colors.
 */
export default class Color extends Number {
    /** Is this a valid color? */
    get valid(): boolean;

    /**
     * A CSS-compatible color string.
     * If this color is not valid, the empty string is returned.
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

    /**
     * The color represented as an HSL array.
     * Assumes r, g, and b are contained in the set [0, 1] and returns h, s, and l in the set [0, 1].
     */
    get hsl(): [number, number, number];

    /**
     * The color represented as a linear RGB array.
     * Assumes r, g, and b are contained in the set [0, 1] and returns linear r, g, and b in the set [0, 1].
     * @see {@link https://en.wikipedia.org/wiki/SRGB#Transformation}
     */
    get linear(): Color;

    /* ------------------------------------------ */
    /*  Color Manipulation Methods                */
    /* ------------------------------------------ */

    override toString(radix?: number): HexColorString;

    /**
     * Serialize the Color.
     * @returns The color as a CSS string
     */
    toJSON(): string;

    /**
     * Returns the color as a CSS string.
     * @returns The color as a CSS string
     */
    toHTML(): string;

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

    /* ------------------------------------------------------------------------------------------- */
    /*                      Real-time performance Methods and Properties                           */
    /*  Important Note:                                                                            */
    /*  These methods are not a replacement, but a tool when real-time performance is needed.      */
    /*  They do not have the flexibility of the "classic" methods and come with some limitations.  */
    /*  Unless you have to deal with real-time performance, you should use the "classic" methods.  */
    /* ------------------------------------------------------------------------------------------- */

    /**
     * Set an rgb array with the rgb values contained in this Color class.
     * @param vec3 Receive the result. Must be an array with at least a length of 3.
     */
    applyRGB(vec3: number[]): void;

    /**
     * Apply a linear interpolation between two colors, according to the weight.
     * @param color1 The first color to mix.
     * @param color2 The second color to mix.
     * @param weight Weight of the linear interpolation.
     * @returns The resulting mixed color
     */
    static mix(color1: number, color2: number, weight: number): number;

    /**
     * Multiply two colors.
     * @param color1       The first color to multiply.
     * @param color2       The second color to multiply.
     * @returns The result.
     */
    static multiply(color1: number, color2: number): number;

    /**
     * Multiply a color by a scalar
     * @param color The color to multiply.
     * @param scalar A static scalar to multiply with.
     * @returns The resulting color as a number.
     */
    static multiplyScalar(color: number, scalar: number): number;

    /**
     * Maximize two colors.
     * @param color1 The first color.
     * @param color2 The second color.
     * @returns The result.
     */
    static maximize(color1: number, color2: number): number;

    /**
     * Maximize a color by a static scalar.
     * @param color The color to maximize.
     * @param scalar Scalar to maximize with (normalized).
     * @returns The resulting color as a number.
     */
    static maximizeScalar(color: number, scalar: number): number;

    /**
     * Add two colors.
     * @param color1 The first color.
     * @param color2 The second color.
     * @returns The resulting color as a number.
     */
    static add(color1: number, color2: number): number;

    /**
     * Add a static scalar to a color.
     * @param color The color.
     * @param scalar Scalar to add with (normalized).
     * @returns The resulting color as a number.
     */
    static addScalar(color: number, scalar: number): number;

    /**
     * Subtract two colors.
     * @param color1 The first color.
     * @param color2 The second color.
     */
    static subtract(color1: number, color2: number): number;

    /**
     * Subtract a color by a static scalar.
     * @param color  The color.
     * @param scalar Scalar to subtract with (normalized).
     * @returns The resulting color as a number.
     */
    static subtractScalar(color: number, scalar: number): number;

    /**
     * Minimize two colors.
     * @param color1 The first color.
     * @param color2 The second color.
     */
    static minimize(color1: number, color2: number): number;

    /**
     * Minimize a color by a static scalar.
     * @param color The color.
     * @param scalar Scalar to minimize with (normalized).
     */
    static minimizeScalar(color: number, scalar: number): number;

    /**
     * Convert a color to RGB and assign values to a passed array.
     * @param color The color to convert to RGB values.
     * @param vec3 Receive the result. Must be an array with at least a length of 3.
     */
    static applyRGB(color: number, vec3: number[]): void;

    /* ------------------------------------------ */
    /*  Factory Methods                           */
    /* ------------------------------------------ */

    /**
     * Create a Color instance from an RGB array.
     * @param color A color input
     * @returns The hex color instance or NaN
     */
    static from(color: ColorSource): Color | number;

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
     * Create a Color instance from an RGB normalized values.
     * @param r The red value
     * @param g The green value
     * @param b The blue value
     * @returns The hex color instance
     */
    static fromRGBvalues(r: number, g: number, b: number): Color;

    /**
     * Create a Color instance from an HSV array.
     * Conversion formula adapted from http://en.wikipedia.org/wiki/HSV_color_space.
     * Assumes h, s, and v are contained in the set [0, 1].
     * @param hsv An HSV tuple
     * @returns The hex color instance
     */
    static fromHSV(hsv: [number, number, number]): Color;

    /**
     * Create a Color instance from an HSL array.
     * Assumes h, s, and l are contained in the set [0, 1].
     * @param hsl An HSL tuple
     * @returns The hex color instance
     */
    static fromHSL(hsl: [number, number, number]): Color;

    /**
     * Create a Color instance (sRGB) from a linear rgb array.
     * Assumes r, g, and b are contained in the set [0, 1].
     * @see {@link https://en.wikipedia.org/wiki/SRGB#Transformation}
     * @param linear The linear rgb array
     * @returns The hex color instance
     */
    static fromLinearRGB(linear: [number, number, number]): Color;
}
