/**
 * A smooth noise generator for one-dimensional values.
 */
export default class SmoothNoise {
    /**
     * @param options Configuration options for the noise process.
     * @param options.amplitude The generated noise will be on the range [0, amplitude].
     * @param options.scale An adjustment factor for the input x values which place them on an appropriate range.
     * @param options.maxReferences The number of pre-generated random numbers to generate.
     */
    constructor(options?: { amplitude?: number; scale?: number; maxReferences?: number });

    /**
     * Amplitude of the generated noise output
     * The noise output is multiplied by this value
     */
    get amplitude(): number[];

    set amplitude(amplitude);

    /**
     * Scale factor of the random indices
     */
    get scale(): number[];

    set scale(scale);

    /**
     * Generate the noise value corresponding to a provided numeric x value.
     * @param x Any finite number
     * @returns The corresponding smoothed noise value
     */
    generate(x: number): number;
}
