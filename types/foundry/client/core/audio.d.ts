export {};

declare global {
    /**
     * A helper class to provide common functionality for working with HTML5 audio and Howler instances
     * A singleton instance of this class is available as ``game.audio``
     */
    class AudioHelper {
        constructor();

        /**
         * The primary Audio Context used to play client-facing sounds.
         * The context is undefined until the user's first gesture is observed.
         */
        context: AudioContext;

        /** The set of AudioBuffer objects which are cached for different audio paths */
        buffers: Map<string, AudioBuffer>;

        /** The set of singleton Sound instances which are cached for different audio paths */
        sounds: Map<string, Sound>;

        /** Get a map of the Sound objects which are currently playing. */
        playing: Map<number, Sound>;

        /**
         * A user gesture must be registered before audio can be played.
         * This Array contains the Sound instances which are requested for playback prior to a gesture.
         * Once a gesture is observed, we begin playing all elements of this Array.
         */
        pending: Function[];

        /** A flag for whether video playback is currently locked by awaiting a user gesture */
        locked: boolean;

        /**
         * Audio Context singleton used for analysing audio levels of each stream
         * Only created if necessary to listen to audio streams.
         */
        protected _audioContext: AudioContext | null;

        /**
         * Map of all streams that we listen to for determining the decibel levels.
         * Used for analyzing audio levels of each stream.
         * Format of the object stored is :
         * {id:
         *   {
         *     stream: MediaStream,
         *     analyser: AudioAnalyser,
         *     interval: Number,
         *     callback: Function
         *   }
         * }
         */
        protected _analyserStreams: Record<string, AnalyserStream>;

        /**
         * Interval ID as returned by setInterval for analysing the volume of streams
         * When set to 0, means no timer is set.
         */
        protected _analyserInterval: number;

        /**
         * Fast Fourier Transform Array.
         * Used for analysing the decibel level of streams. The array is allocated only once
         * then filled by the analyser repeatedly. We only generate it when we need to listen to
         * a stream's level, so we initialize it to null.
         */
        protected _fftArray: Float32Array;

        /**
         * The Native interval for the AudioHelper to analyse audio levels from streams
         * Any interval passed to startLevelReports() would need to be a multiple of this value.
         */
        static levelAnalyserNativeInterval: number;

        static registerSettings(): void;

        /**
         * Create a Howl instance
         */
        create({
            src,
            preload,
            autoplay,
            volume,
            loop,
        }: {
            src: string;
            preload: boolean;
            autoplay: boolean;
            volume: number;
            loop: boolean;
        }): void;

        /**
         * Play a single audio effect by it's source path and Howl ID
         */
        play(src: string, id: number): void;

        /**
         * Register an event listener to await the first mousemove gesture and begin playback once observed
         */
        awaitFirstGesture(): void;

        /**
         * Request that other connected clients begin preloading a certain sound path.
         * @param src The source file path requested for preload
         * @returns A Promise which resolves once the preload is complete
         */
        preload(): Promise<Sound>;

        /**
         * Play a one-off sound effect which is not part of a Playlist
         *
         * @param data          An object configuring the audio data to play
         * @param data.src      The audio source file path, either a public URL or a local path relative to the public directory
         * @param data.volume   The volume level at which to play the audio, between 0 and 1.
         * @param data.autoplay Begin playback of the audio effect immediately once it is loaded.
         * @param data.loop     Loop the audio effect and continue playing it until it is manually stopped.
         * @param push          Push the audio sound effect to other connected clients?
         *
         * @return              A Howl instance which controls audio playback.
         *
         * @example
         * // Play the sound of a locked door for all players
         * Audio.play({src: "sounds/lock.wav", volume: 0.8, autoplay: true, loop: false}, true);
         */
        static play(data: { src: string; autoplay: boolean; volume: number; loop: boolean }, push: boolean): void;

        /**
         * Returns the volume value based on a range input volume control's position.
         * This is using an exponential approximation of the logarithmic nature of audio level perception
         * Based on https://www.dr-lex.be/info-stuff/volumecontrols.html
         * We're using x^3 by default instead of x^4 otherwise the audio becomes nearly silent around the 40% mark.
         * @param control   Value between [0, 1] of the range input
         * @param order     (optional) the exponent of the curve (default: 3)
         */
        static inputToVolume(control: number, order: number): number;

        /**
         * Counterpart to inputToVolume()
         * Returns the input range value based on a volume
         * @param control   Value between [0, 1] of the volume level
         * @param order     (optional) the exponent of the curve (default: 3)
         */
        static volumeToInput(volume: number, order: number): number;
    }
}

interface AnalyserStream {
    stream: MediaStream;
    analyser: object;
    interval: number;
    callback: Function;
}
