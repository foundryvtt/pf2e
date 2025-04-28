import { BandName, ContextName, SoundCreationOptions } from "./_types.mjs";
import AudioBufferCache from "./cache.mjs";
import Sound from "./sound.mjs";

/**
 * A helper class to provide common functionality for working with the Web Audio API.
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
 * A singleton instance of this class is available as game#audio.
 * @see {@link foundry.Game#audio}
 */
export default class AudioHelper {
    constructor();

    /**
     * An array containing all possible audio context names.
     */
    static AUDIO_CONTEXTS: readonly ContextName[];

    /**
     * The Native interval for the AudioHelper to analyse audio levels from streams
     * Any interval passed to startLevelReports() would need to be a multiple of this value.
     */
    static levelAnalyserNativeInterval: number;

    /**
     * The cache size threshold after which audio buffers will be expired from the cache to make more room.
     * 1 gigabyte, by default.
     */
    static THRESHOLD_CACHE_SIZE_BYTES: number;

    /**
     * Audio Context singleton used for analysing audio levels of each stream
     * Only created if necessary to listen to audio streams.
     */
    static #analyzerContext: AudioContext;

    /**
     * The set of singleton Sound instances which are shared across multiple uses of the same sound path.
     */
    sounds: Map<string, WeakRef<Sound>>;

    /**
     * Get a map of the Sound objects which are currently playing.
     */
    playing: Map<number, Sound>;

    /**
     * A user gesture must be registered before audio can be played.
     * This Array contains the Sound instances which are requested for playback prior to a gesture.
     * Once a gesture is observed, we begin playing all elements of this Array.
     * @see {@link Sound}
     */
    pending: Function[];

    /**
     * A Promise which resolves once the game audio API is unlocked and ready to use.
     */
    unlock: Promise<void>;

    /**
     * A flag for whether video playback is currently locked by awaiting a user gesture
     */
    locked: boolean;

    /**
     * A singleton audio context used for playback of music.
     */
    music: AudioContext;

    /**
     * A singleton audio context used for playback of environmental audio.
     */
    environment: AudioContext;

    /**
     * A singleton audio context used for playback of interface sounds and effects.
     */
    interface: AudioContext;

    /**
     * For backwards compatibility, AudioHelper#context refers to the context used for music playback.
     */
    get context(): AudioContext;

    /**
     * A singleton cache used for audio buffers.
     */
    buffers: AudioBufferCache;

    /**
     * A global mute which suppresses all 3 audio channels.
     */
    get globalMute(): boolean;

    set globalMute(muted);

    /**
     * Create a Sound instance for a given audio source URL
     * @param options Sound creation options
     */
    create(options?: SoundCreationOptions): Sound;

    /**
     * Test whether a source file has a supported audio extension type
     * @param src A requested audio source path
     * @returns Does the filename end with a valid audio extension?
     */
    static hasAudioExtension(src: string): boolean;

    /* -------------------------------------------- */

    /**
     * Given an input file path, determine a default name for the sound based on the filename
     * @param src An input file path
     * @returns A default sound name for the path
     */
    static getDefaultSoundName(src: string): string;

    /**
     * Play a single Sound by providing its source.
     * @param src            The file path to the audio source beingplayed
     * @param options Additional options which configure playback
     * @param options.context A specific AudioContext within which to play
     * @returns The created Sound which is now playing
     */
    play(src: string, options?: { context?: AudioContext }): Promise<Sound>;

    /**
     * Register an event listener to await the first mousemove gesture and begin playback once observed.
     * @returns The unlocked audio context
     */
    awaitFirstGesture(): Promise<void>;

    /**
     * Request that other connected clients begin preloading a certain sound path.
     * @param src The source file path requested for preload
     * @returns A Promise which resolves once the preload is complete
     */
    preload(src: string): Promise<Sound>;

    /* -------------------------------------------- */
    /*  Settings and Volume Controls                */
    /* -------------------------------------------- */

    /**
     * Register client-level settings for global volume controls.
     */
    static registerSettings(): void;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    /**
     * Open socket listeners which transact ChatMessage data
     */
    static _activateSocketListeners(socket: io.Socket): void;

    /**
     * Play a one-off sound effect which is not part of a Playlist
     * @param data An object configuring the audio data toplay.
     * @param data.src The audio source file path, either a public URL or a local path relative to the public directory.
     * @param data.channel An audio channel in CONST.AUDIO_CHANNELS where the sound should play. Default: `"interface"`.
     * @param data.volume The volume level at which to play the audio, between 0 and 1. Default: `1`.
     * @param data.autoplay Begin playback of the audio effect immediately once it is loaded. Default: `false`.
     * @param data.loop Loop the audio effect and continue playing it until it is manually stopped. Default: `false`.
     * @param socketOptions Options which only apply when emitting playback over websocket. As a boolean, emits (true)
     *                      or does not emit (false) playback to all other clients. As an object, can configure which
     *                      recipients (an array of User IDs) should receive the event (all clients by default).
     *                      Default: `false`.
     * @returns A Sound instance which controls audio playback, or nothing if `data.autoplay` is false.
     *
     * @example Play the sound of a locked door for all players
     * ```js
     * AudioHelper.play({src: "sounds/lock.wav", volume: 0.8, loop: false}, true);
     * ```
     */
    static play(
        data: { src: string; channel?: string; volume?: number; autoplay?: boolean; loop?: boolean },
        socketOptions: boolean | { recipients: string[] },
    ): Sound | void;

    /**
     * Begin loading the sound for a provided source URL adding its
     * @param src            The audio source path topreload
     * @returns The created and loaded Sound ready for playback
     */
    static preloadSound(src: string): Promise<Sound>;

    /**
     * Returns the volume value based on a range input volume control's position.
     * This is using an exponential approximation of the logarithmic nature of audio level perception
     * @param value Value between [0, 1] of the range input
     * @param order The exponent of the curve
     */
    static inputToVolume(value: number | string, order?: number): number;

    /**
     * Counterpart to inputToVolume()
     * Returns the input range value based on a volume
     * @param volume Value between [0, 1of the volume level
     * @param order The exponent of the curve
     */
    static volumeToInput(volume: number, order?: number): number;

    /**
     * Converts a volume level to a human-readable percentage value.
     * @param volume Value in the interval [0, 1of the volume level.
     * @param options.label Prefix the returned tooltip with a localized 'Volume: ' label. This should be used if the
     *                      returned string is intended for assistive technologies, such as the aria-valuetext
     *                      attribute.
     * @param options.decimalPlaces The number of decimal places to round the percentage to.
     */
    static volumeToPercentage(volume: number, options?: { label?: boolean; decimalPlaces?: number }): string;

    /* -------------------------------------------- */
    /*  Audio Stream Analysis                       */
    /* -------------------------------------------- */

    /**
     * Returns a singleton AudioContext if one can be created.
     * An audio context may not be available due to limited resources or browser compatibility
     * in which case null will be returned
     *
     * @returns A singleton AudioContext or null if one is not available
     */
    getAnalyzerContext(): AudioContext;

    /**
     * Registers a stream for periodic reports of audio levels.
     * Once added, the callback will be called with the maximum decibel level of
     * the audio tracks in that stream since the last time the event was fired.
     * The interval needs to be a multiple of AudioHelper.levelAnalyserNativeInterval which defaults at 50ms
     *
     * @param id An id to assign to this report. Can be used to stop reports
     * @param stream The MediaStream instance to report activity on.
     * @param callback  The callback function to call with the decibel level. `callback(dbLevel)`
     * @param interval The interval at which to produce reports.
     * @param smoothing The smoothingTimeConstant to set on the audio analyser.
     * @returns Returns whether listening to the stream was successful
     */
    startLevelReports(
        id: string,
        stream: MediaStream,
        callback: Function,
        interval?: number,
        smoothing?: number,
    ): boolean;

    /**
     * Stop sending audio level reports
     * This stops listening to a stream and stops sending reports.
     * If we aren't listening to any more streams, cancel the global analyser timer.
     * @param id The id of the reports that passed to startLevelReports.
     */
    stopLevelReports(id: string): void;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * Log a debugging message if the audio debugging flag is enabled.
     * @param message The message to log
     */
    debug(message: string): void;

    /* -------------------------------------------- */
    /*  Public Analyzer Methods and Properties      */
    /* -------------------------------------------- */

    /**
     * A static inactivity threshold for audio analysis, in milliseconds.
     * If no band value is requested for a channel within this duration,
     * the analyzer is disabled to conserve resources (unless the analyzer is enabled with the `keepAlive=true` option)
     */
    static ANALYSIS_TIMEOUT_MS: number;

    /**
     * Enable the analyzer for a given context (music, environment, interface),
     * attaching an AnalyserNode to its gain node if not already active.
     * @param options.keepAlive If true, this analyzer will not auto-disable after inactivity.
     */
    enableAnalyzer(contextName: ContextName, options?: { keepAlive?: boolean }): void;

    /**
     * Disable the analyzer for a given context, disconnecting the AnalyserNode.
     */
    disableAnalyzer(contextName: ContextName): void;

    /**
     * Returns a normalized band value in [0,1].
     * Optionally, we can subtract the actual gainNode (global) volume from the measurement.
     * - Important:
     *   - Local gain applied to {@link foundry.audio.Sound} source can't be ignored.
     *   - If this method needs to activate the analyzer, the latter requires a brief warm-up.
     *     One or two frames may be needed before it produces meaningful values (instead of returning 0).
     * @param options.ignoreVolume If true, remove the real-time channel volume from the measurement.
     * @returns The normalized band value in [0,1].
     */
    getBandLevel(contextName: ContextName, bandName: BandName, options?: { ignoreVolume?: boolean }): number;

    /**
     * Retrieve a single "peak" analyzer value across the three main audio contexts (music, environment, interface).
     * This takes the maximum of the three normalized [0,1] values for a given frequency band.
     * @param band The frequency band for which to retrieve an analyzer value.
     * @param options
     * @param options.ignoreVolume If true, remove the real-time channel volume from the measurement.
     * @returns A number in the [0,1] range representing the loudest band value among the three contexts.
     */
    getMaxBandLevel(band?: BandName, options?: { ignoreVolume?: boolean }): number;
}
