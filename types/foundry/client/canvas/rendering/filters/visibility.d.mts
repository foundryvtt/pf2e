/**
 * Apply visibility coloration according to the baseLine color.
 * Uses very lightweight gaussian vertical and horizontal blur filter passes.
 */
export default class VisibilityFilter extends AbstractBaseMaskFilter {
    /** @override */
    static override defaultUniforms: {
        exploredColor: number[];
        unexploredColor: number[];
        screenDimensions: number[];
        visionTexture: null;
        primaryTexture: null;
        overlayTexture: null;
        overlayMatrix: PIXI.Matrix;
        hasOverlayTexture: boolean;
    };
    /** @override */
    static override create(initialUniforms?: {}, options?: {}): VisibilityFilter;
    /** @override */
    static override fragmentShader(options: any): string;
    constructor(...args: any[]);
    /**
     * Set the blur strength
     * @param {number} value    blur strength
     */
    set blur(value: number);
    get blur(): number;
    /** @override */
    override apply(filterManager: any, input: any, output: any, clear: any): void;
    /**
     * Calculate the fog overlay sprite matrix.
     * @param {PIXI.FilterSystem} filterManager
     */
    calculateMatrix(filterManager: PIXI.FilterSystem): void;
    #private;
}
import AbstractBaseMaskFilter from "./base-mask-filter.mjs";
