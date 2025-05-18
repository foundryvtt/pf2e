import { EventEmitter } from "@common/utils/event-emitter.mjs";
import { SoundPlaybackOptions, SoundScheduleCallback } from "./_types.mjs";

type SoundState = (typeof Sound.STATES)[keyof typeof Sound.STATES];

/**
 * A container around an AudioNode which manages sound playback in Foundry Virtual Tabletop.
 * Each Sound is either an AudioBufferSourceNode (for short sources) or a MediaElementAudioSourceNode (for long ones).
 * This class provides an interface around both types which allows standardized control over playback.
 */
export default class Sound extends EventEmitter {
    /**
     * Construct a Sound by providing the source URL and other options.
     * @param src     The audio source path, either a relative path or a remote URL
     * @param options Additional options which configure the Sound
     * @param options.context      A non-default audio context within which the sound should play
     * @param options.forceBuffer  Force use of an AudioBufferSourceNode even if the audio duration is long
     */
    constructor(src: string, options?: { context?: AudioContext; forceBuffer?: boolean });

    /**
     * The sequence of container loading states.
     */
    static STATES: {
        FAILED: -1;
        NONE: 0;
        LOADING: 1;
        LOADED: 2;
        STARTING: 3;
        PLAYING: 4;
        PAUSED: 5;
        STOPPING: 6;
        STOPPED: 7;
    };

    /**
     * The maximum duration, in seconds, for which an AudioBufferSourceNode will be used.
     * Otherwise, a MediaElementAudioSourceNode will be used.
     */
    static MAX_BUFFER_DURATION: number;

    static override emittedEvents: string[];

    /**
     * A unique integer identifier for this sound.
     */
    id: number;

    /**
     * The audio source path.
     * Either a relative path served by the running Foundry VTT game server or a remote URL.
     */
    src: string;

    /**
     * The audio context within which this Sound is played.
     */
    get context(): AudioContext;

    /**
     * The AudioSourceNode used to control sound playback.
     */
    get sourceNode(): AudioBufferSourceNode | MediaElementAudioSourceNode;

    /**
     * The GainNode used to control volume for this sound.
     */
    gainNode: GainNode;

    /**
     * An AudioBuffer instance, if this Sound uses an AudioBufferSourceNode for playback.
     */
    buffer: AudioBuffer | null;

    /**
     * An HTMLAudioElement, if this Sound uses a MediaElementAudioSourceNode for playback.
     */
    element: HTMLAudioElement | null;

    /**
     * The life-cycle state of the sound.
     */
    protected _state: SoundState;

    /**
     * Has the audio file been loaded either fully or for streaming.
     */
    get loaded(): boolean;

    /**
     * Did the audio file fail to load.
     */
    get failed(): boolean;

    /**
     * Is this sound currently playing?
     */
    get playing(): boolean;

    /**
     * Does this Sound use an AudioBufferSourceNode?
     * Otherwise, the Sound uses a streamed MediaElementAudioSourceNode.
     */
    get isBuffer(): boolean;

    /**
     * A convenience reference to the GainNode gain audio parameter.
     */
    get gain(): AudioParam | undefined;

    /**
     * The AudioNode destination which is the output target for the Sound.
     */
    destination: AudioNode;

    /**
     * A pipeline of AudioNode instances to be applied to Sound playback.
     */
    effects: AudioNode[];

    /**
     * The currently playing volume of the sound.
     * Undefined until playback has started for the first time.
     */
    get volume(): number | undefined;

    set volume(value);
    /**
     * The time in seconds at which playback was started.
     */
    startTime: number;

    /**
     * The time in seconds at which playback was paused.
     */
    pausedTime: number;

    /**
     * The total duration of the audio source in seconds.
     */
    get duration(): number;

    /**
     * The current playback time of the sound.
     */
    get currentTime(): number;

    /**
     * Is the sound looping?
     */
    get loop(): boolean;

    set loop(value);

    /**
     * An internal reference to some object which is managing this Sound instance.
     * @internal
     */
    _manager: object | null;

    /* -------------------------------------------- */
    /*  Life-Cycle Methods                          */
    /* -------------------------------------------- */

    /**
     * Load the audio source and prepare it for playback, either using an AudioBuffer or a streamed HTMLAudioElement.
     * @param options Additional options which affect resource loading
     * @param options.autoplay        Automatically begin playback of the sound once loaded
     * @param options.autoplayOptions Playback options passed to Sound#play, if autoplay
     * @returns A Promise which resolves to the Sound once it is loaded
     */
    load(options?: { autoplay?: boolean; autoplayOptions?: SoundPlaybackOptions }): Promise<this>;

    /**
     * An inner method which handles loading so that it can be de-duplicated under a single shared Promise resolution.
     * This method is factored out to allow for subclasses to override loading behavior.
     * @returns A Promise which resolves once the sound is loaded
     * @throws An error if loading failed for any reason
     */
    protected _load(): Promise<void>;

    /**
     * Begin playback for the Sound.
     * This method is asynchronous because playback may not start until after an initially provided delay.
     * The Promise resolves *before* the fade-in of any configured volume transition.
     * @param options Options which configure the beginning of sound playback
     * @returns A Promise which resolves once playback has started (excluding fade)
     */
    play(options?: SoundPlaybackOptions): Promise<this>;

    /**
     * Begin playback for the configured pipeline and playback options.
     * This method is factored out so that subclass implementations of Sound can implement alternative behavior.
     */
    protected _play(): void;

    /**
     * Pause playback of the Sound.
     * For AudioBufferSourceNode this stops playback after recording the current time.
     * Calling Sound#play will resume playback from the pausedTime unless some other offset is passed.
     * For a MediaElementAudioSourceNode this simply calls the HTMLAudioElement#pause method directly.
     */
    pause(): void;

    /**
     * Pause playback of the Sound.
     * This method is factored out so that subclass implementations of Sound can implement alternative behavior.
     */
    protected _pause(): void;

    /**
     * Stop playback for the Sound.
     * This method is asynchronous because playback may not stop until after an initially provided delay.
     * The Promise resolves *after* the fade-out of any configured volume transition.
     * @param options Options which configure the stopping of sound playback
     * @returns A Promise which resolves once playback is fully stopped (including fade)
     */
    stop(options?: SoundPlaybackOptions): Promise<this>;

    /**
     * Stop playback of the Sound.
     * This method is factored out so that subclass implementations of Sound can implement alternative behavior.
     */
    protected _stop(): void;

    /**
     * Fade the volume for this sound between its current level and a desired target volume.
     * @param volume  The desired target volume level between 0 and 1
     * @param options Additional options that configure the fade operation
     * @param options.duration The duration of the fade effect in milliseconds
     * @param options.from     A volume level to start from, the current volume by default
     * @param options.type     The type of fade easing, "linear" or "exponential"
     * @returns A Promise that resolves after the requested fade duration
     */
    fade(
        volume: number,
        options?: { duration?: number; from?: number; type?: "linear" | "exponential" },
    ): Promise<void>;

    /**
     * Wait a certain scheduled duration within this sound's own AudioContext.
     * @param duration The duration to wait in milliseconds
     * @returns A promise which resolves after the waited duration
     */
    wait(duration: number): Promise<void>;

    /**
     * Schedule a function to occur at the next occurrence of a specific playbackTime for this Sound.
     * @param fn           A function that will be called with this Sound as its single argument
     * @param playbackTime The desired playback time at which the function should be called
     * @returns A Promise which resolves to the returned value of the provided function once it has been evaluated.
     *
     * @example Schedule audio playback changes
     * ```js
     * sound.schedule(() => console.log("Do something exactly 30 seconds into the track"), 30);
     * sound.schedule(() => console.log("Do something next time the track loops back to the beginning"), 0);
     * sound.schedule(() => console.log("Do something 5 seconds before the end of the track"), sound.duration - 5);
     * ```
     */
    schedule(fn: SoundScheduleCallback, playbackTime: number): Promise<unknown>;

    /**
     * Update the array of effects applied to a Sound instance.
     * Optionally a new array of effects can be assigned. If no effects are passed, the current effects are re-applied.
     * @param effects An array of AudioNode effects to apply
     */
    applyEffects(effects?: AudioNode[]): void;

    /* -------------------------------------------- */
    /*  Helper Methods                              */
    /* -------------------------------------------- */

    /**
     * Create any AudioNode instances required for playback of this Sound.
     */
    protected _createNodes(): void;

    /**
     * Create the audio pipeline used to play this Sound.
     * The GainNode is reused each time to link volume changes across multiple playbacks.
     * The AudioSourceNode is re-created every time that Sound#play is called.
     */
    protected _connectPipeline(): void;

    /**
     * Disconnect the audio pipeline once playback is stopped.
     * Walk backwards along the Sound##pipeline from the Sound#destination, disconnecting each node.
     */
    protected _disconnectPipeline(): void;
}

export {};
