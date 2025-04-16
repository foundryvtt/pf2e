/**
 * A filter which implements an inner or outer glow around the source texture.
 * Inspired from https://github.com/pixijs/filters/tree/main/filters/glow
 * @license MIT
 */
export default class GlowOverlayFilter extends AbstractBaseFilter {
    /** @inheritdoc */
    static defaultUniforms: {
        distance: number;
        glowColor: number[];
        quality: number;
        time: number;
        knockout: boolean;
        alpha: number;
    };
    /**
     * Dynamically create the fragment shader used for filters of this type.
     * @param {number} quality
     * @param {number} distance
     * @returns {string}
     */
    static createFragmentShader(quality: number, distance: number): string;
    /** @inheritdoc */
    static create(initialUniforms?: {}): GlowOverlayFilter;
    /**
     * The inner strength of the glow.
     * @type {number}
     */
    innerStrength: number;
    /**
     * The outer strength of the glow.
     * @type {number}
     */
    outerStrength: number;
    /**
     * Should this filter auto-animate?
     * @type {boolean}
     */
    animated: boolean;
    /** @override */
    override apply(filterManager: any, input: any, output: any, clear: any): void;
}
import AbstractBaseFilter from "./base-filter.mjs";
