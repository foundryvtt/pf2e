/**
 * Apply a vertical or horizontal gaussian blur going inward by using alpha as the penetrating channel.
 */
export class AlphaBlurFilterPass extends PIXI.Filter {
    /**
     * @param horizontal If the pass is horizontal (true) or vertical (false).
     * @param strength Strength of the blur (distance of sampling).
     * @param quality Number of passes to generate the blur. More passes = Higher quality = Lower Perf.
     * @param resolution Resolution of the filter.
     * @param kernelSize Number of kernels to use. More kernels = Higher quality = Lower Perf.
     */
    constructor(horizontal: boolean, strength?: number, quality?: number, resolution?: number, kernelSize?: number);

    /**
     * If the pass is horizontal (true) or vertical (false).
     */
    horizontal: boolean;

    /**
     * Strength of the blur (distance of sampling).
     */
    strength: number;

    /**
     * The number of passes to generate the blur.
     */
    passes: number;

    /**
     * The quality of the filter is defined by its number of passes.
     */
    get quality(): number;

    set quality(value);

    /**
     * The strength of the blur filter in pixels.
     */
    get blur(): number;

    set blur(value);

    /**
     * The kernels containing the gaussian constants.
     */
    static GAUSSIAN_VALUES: Record<number, number[]>;

    /**
     * The fragment template generator
     * @param kernelSize The number of kernels to use.
     * @returns The generated fragment shader.
     */
    static fragTemplate(kernelSize: number): string;

    /**
     * The vertex template generator
     * @param kernelSize The number of kernels to use.
     * @param horizontal If the vertex should handle horizontal or vertical pass.
     * @returns The generated vertex shader.
     */
    static vertTemplate(kernelSize: number, horizontal: boolean): string;

    /**
     * Generating the dynamic part of the blur in the fragment
     * @param kernelSize The number of kernels to use.
     * @returns The dynamic blur part.
     */
    static generateBlurFragSource(kernelSize: number): string;

    /**
     * Generating the dynamic part of the blur in the vertex
     * @param kernelSize The number of kernels to use.
     * @param horizontal If the vertex should handle horizontal or vertical pass.
     * @returns The dynamic blur part.
     */
    static generateBlurVertSource(kernelSize: number, horizontal: boolean): string;

    override apply(
        filterManager: PIXI.FilterSystem,
        input: PIXI.RenderTexture,
        output: PIXI.RenderTexture,
        clearMode?: PIXI.CLEAR_MODES,
        _currentState?: PIXI.FilterState,
    ): void;
}

/**
 * Apply a gaussian blur going inward by using alpha as the penetrating channel.
 */
export default class AlphaBlurFilter extends PIXI.Filter {
    /**
     * @param {number} [strength=8]     Strength of the blur (distance of sampling).
     * @param {number} [quality=4]      Number of passes to generate the blur. More passes = Higher quality = Lower Perf.
     * @param {number} [resolution=PIXI.Filter.defaultResolution]  Resolution of the filter.
     * @param {number} [kernelSize=5]   Number of kernels to use. More kernels = Higher quality = Lower Perf.
     */
    constructor(strength?: number, quality?: number, resolution?: number, kernelSize?: number);

    override apply(
        filterManager: PIXI.FilterSystem,
        input: PIXI.RenderTexture,
        output: PIXI.RenderTexture,
        clearMode?: PIXI.CLEAR_MODES,
        _currentState?: PIXI.FilterState,
    ): void;

    /**
     * Update the filter padding according to the blur strength value (0 if _repeatEdgePixels is active)
     */
    updatePadding(): void;

    /**
     * The amount of blur is forwarded to the X and Y filters.
     */
    get blur(): number;

    set blur(value);

    /**
     * The quality of blur defines the number of passes used by subsidiary filters.
     */
    get quality(): number;

    set quality(value);

    /**
     * Whether to repeat edge pixels, adding padding to the filter area.
     */
    get repeatEdgePixels(): boolean;

    set repeatEdgePixels(value);

    /**
     * Provided for completeness with PIXI.BlurFilter
     */
    get blurX(): number;

    set blurX(value);

    /**
     * Provided for completeness with PIXI.BlurFilter
     */
    get blurY(): number;

    set blurY(value);
    /**
     * Provided for completeness with PIXI.BlurFilter
     */
    get blendMode(): number;

    set blendMode(value);
}
