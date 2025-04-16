/**
 * A smooth noise generator for one-dimensional values.
 * @param {object} options                        Configuration options for the noise process.
 * @param {number} [options.amplitude=1]          The generated noise will be on the range [0, amplitude].
 * @param {number} [options.scale=1]              An adjustment factor for the input x values which place them on an
 *                                                appropriate range.
 * @param {number} [options.maxReferences=256]    The number of pre-generated random numbers to generate.
 */
export default class SmoothNoise {
    constructor({ amplitude, scale, maxReferences }?: {
        amplitude?: number | undefined;
        scale?: number | undefined;
        maxReferences?: number | undefined;
    });
    set amplitude(amplitude: number[]);
    /**
     * Amplitude of the generated noise output
     * The noise output is multiplied by this value
     * @type {number[]}
     */
    get amplitude(): number[];
    set scale(scale: number[]);
    /**
     * Scale factor of the random indices
     * @type {number[]}
     */
    get scale(): number[];
    _amplitude: any;
    _scale: any;
    /**
     * Generate the noise value corresponding to a provided numeric x value.
     * @param {number} x      Any finite number
     * @return {number}       The corresponding smoothed noise value
     */
    generate(x: number): number;
}
