/**
 * A sound effect which applies a biquad filter.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode}
 */
export default class BiquadFilterEffect extends BiquadFilterNode {
    /**
     * A ConvolverEffect is constructed by passing the following parameters.
     * @param context The audio context required by the BiquadFilterNode
     * @param options Additional options which modify the BiquadFilterEffect behavior
     * @param options.type The filter type to apply
     * @param options.intensity The initial intensity of the effect
     */
    constructor(context: AudioContext, options?: { type?: BiquadFilterType; intensity?: number });

    /**
     * Adjust the intensity of the effect on a scale of 0 to 10.
     */
    get intensity(): number;

    set intensity(intensity);

    /**
     * Update the state of the effect node given the active flag and numeric intensity.
     * @param options Options which are updated
     * @param options.intensity A new effect intensity
     * @param options.type A new filter type
     */
    update(options?: { intensity?: number; type?: BiquadFilterType }): void;
}
