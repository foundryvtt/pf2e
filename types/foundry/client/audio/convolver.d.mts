/**
 * A sound effect which applies a convolver filter.
 * The convolver effect splits the input sound into two separate paths:
 * 1. A "dry" node which is the original sound
 * 2. A "wet" node which contains the result of the convolution
 * This effect mixes between the dry and wet channels based on the intensity of the reverb effect.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode}
 */
export default class ConvolverEffect extends ConvolverNode {
    /**
     * A ConvolverEffect is constructed by passing the following parameters.
     * @param {AudioContext} context      The audio context required by the ConvolverNode
     * @param {object} [options]          Additional options which modify the ConvolverEffect behavior
     * @param {string} [options.impulseResponsePath]  The file path to the impulse response buffer to use
     * @param {number} [options.intensity]            The initial intensity of the effect
     */
    constructor(context: AudioContext, options?: { impulseResponsePath?: string; intensity?: number });

    /**
     * Adjust the intensity of the effect on a scale of 0 to 10.
     */
    get intensity(): number;

    set intensity(value);

    /**
     * Update the state of the effect node given the active flag and numeric intensity.
     * @param options Options which are updated
     * @param options.intensity A new effect intensity
     */
    update(options?: { intensity?: number }): void;

    override disconnect(): void;
    override disconnect(output: number): void;
    override disconnect(destinationNode: AudioNode): void;
    override disconnect(destinationNode: AudioNode, output: number): void;
    override disconnect(destinationNode: AudioNode, output: number, input: number): void;
    override disconnect(destinationParam: AudioParam): void;
    override disconnect(destinationParam: AudioParam, output: number): void;

    override connect(destinationNode: AudioNode, output?: number, input?: number): AudioNode;
    override connect(destinationParam: AudioParam, output?: number): void;

    /**
     * Additional side effects performed when some other AudioNode connects to this one.
     * This behavior is not supported by the base WebAudioAPI but is needed here for more complex effects.
     * @param sourceNode An upstream source node that is connecting to this one
     */
    onConnectFrom(sourceNode: AudioNode): void;
}
