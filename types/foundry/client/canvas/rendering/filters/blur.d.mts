/**
 * Apply a vertical or horizontal gaussian blur going inward by using alpha as the penetrating channel.
 * @param {boolean} horizontal      If the pass is horizontal (true) or vertical (false).
 * @param {number} [strength=8]     Strength of the blur (distance of sampling).
 * @param {number} [quality=4]      Number of passes to generate the blur. More passes = Higher quality = Lower Perf.
 * @param {number} [resolution=PIXI.Filter.defaultResolution]  Resolution of the filter.
 * @param {number} [kernelSize=5]   Number of kernels to use. More kernels = Higher quality = Lower Perf.
 */
export class AlphaBlurFilterPass extends PIXI.Filter {
    /**
     * The kernels containing the gaussian constants.
     * @type {Record<number, number[]>}
     */
    static GAUSSIAN_VALUES: Record<number, number[]>;
    /**
     * The fragment template generator
     * @param {number} kernelSize   The number of kernels to use.
     * @returns {string}            The generated fragment shader.
     */
    static fragTemplate(kernelSize: number): string;
    /**
     * The vertex template generator
     * @param {number} kernelSize   The number of kernels to use.
     * @param {boolean} horizontal  If the vertex should handle horizontal or vertical pass.
     * @returns {string}            The generated vertex shader.
     */
    static vertTemplate(kernelSize: number, horizontal: boolean): string;
    /**
     * Generating the dynamic part of the blur in the fragment
     * @param {number} kernelSize   The number of kernels to use.
     * @returns {string}            The dynamic blur part.
     */
    static generateBlurFragSource(kernelSize: number): string;
    /**
     * Generating the dynamic part of the blur in the vertex
     * @param {number} kernelSize   The number of kernels to use.
     * @param {boolean} horizontal  If the vertex should handle horizontal or vertical pass.
     * @returns {string}            The dynamic blur part.
     */
    static generateBlurVertSource(kernelSize: number, horizontal: boolean): string;
    constructor(horizontal: any, strength?: number, quality?: number, resolution?: number | null, kernelSize?: number);
    /**
     * If the pass is horizontal (true) or vertical (false).
     * @type {boolean}
     */
    horizontal: boolean;
    /**
     * Strength of the blur (distance of sampling).
     * @type {number}
     */
    strength: number;
    /**
     * The number of passes to generate the blur.
     * @type {number}
     */
    passes: number;
    set quality(value: number);
    /**
     * The quality of the filter is defined by its number of passes.
     * @returns {number}
     */
    get quality(): number;
    set blur(value: number);
    /**
     * The strength of the blur filter in pixels.
     * @returns {number}
     */
    get blur(): number;
    /** @override */
    override apply(filterManager: any, input: any, output: any, clearMode: any): any;
}
/**
 * Apply a gaussian blur going inward by using alpha as the penetrating channel.
 * @param {number} [strength=8]     Strength of the blur (distance of sampling).
 * @param {number} [quality=4]      Number of passes to generate the blur. More passes = Higher quality = Lower Perf.
 * @param {number} [resolution=PIXI.Filter.defaultResolution]  Resolution of the filter.
 * @param {number} [kernelSize=5]   Number of kernels to use. More kernels = Higher quality = Lower Perf.
 */
export default class AlphaBlurFilter extends PIXI.Filter {
    constructor(strength?: number, quality?: number, resolution?: number | null, kernelSize?: number);
    blurXFilter: AlphaBlurFilterPass;
    blurYFilter: AlphaBlurFilterPass;
    _repeatEdgePixels: boolean;
    set quality(value: number);
    /**
     * The quality of blur defines the number of passes used by subsidiary filters.
     * @type {number}
     */
    get quality(): number;
    set blur(value: number);
    /**
     * The amount of blur is forwarded to the X and Y filters.
     * @type {number}
     */
    get blur(): number;
    /** @override */
    override apply(filterManager: any, input: any, output: any, clearMode: any): void;
    /**
     * Update the filter padding according to the blur strength value (0 if _repeatEdgePixels is active)
     */
    updatePadding(): void;
    set repeatEdgePixels(value: boolean);
    /**
     * Whether to repeat edge pixels, adding padding to the filter area.
     * @type {boolean}
     */
    get repeatEdgePixels(): boolean;
    set blurX(value: number);
    /**
     * Provided for completeness with PIXI.BlurFilter
     * @type {number}
     */
    get blurX(): number;
    set blurY(value: number);
    /**
     * Provided for completeness with PIXI.BlurFilter
     * @type {number}
     */
    get blurY(): number;
    set blendMode(value: number);
    /**
     * Provided for completeness with PIXI.BlurFilter
     * @type {number}
     */
    get blendMode(): number;
}
