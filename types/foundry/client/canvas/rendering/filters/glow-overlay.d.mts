import AbstractBaseFilter from "./base-filter.mjs";

/**
 * A filter which implements an inner or outer glow around the source texture.
 * Inspired from https://github.com/pixijs/filters/tree/main/filters/glow
 * @license MIT
 */
export default class GlowOverlayFilter extends AbstractBaseFilter {
    static override defaultUniforms: {
        distance: number;
        glowColor: number[];
        quality: number;
        time: number;
        knockout: boolean;
        alpha: number;
    };

    /**
     * Dynamically create the fragment shader used for filters of this type.
     */
    static createFragmentShader(quality: number, distance: number): string;

    static override create(initialUniforms?: object): GlowOverlayFilter;

    /**
     * The inner strength of the glow.
     */
    innerStrength: number;

    /**
     * The outer strength of the glow.
     */
    outerStrength: number;

    /**
     * Should this filter auto-animate?
     */
    animated: boolean;

    apply(filterManager: any, input: any, output: any, clear: any): void;
}
