/**
 * A helper class to provide common functionality for working with HTML5 video objects
 * A singleton instance of this class is available as ``game.video``
 */
declare class VideoHelper {
    constructor();

    /**
     * A user gesture must be registered before video playback can begin.
     * This Set records the video elements which await such a gesture.
     */
    pending: Set<HTMLVideoElement>;

    /** A mapping of base64 video thumbnail images */
    thumbs: Map<string, string>;

    /** A flag for whether video playback is currently locked by awaiting a user gesture */
    locked: boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Return the HTML element which provides the source for a loaded texture.
     * @param mesh The rendered mesh
     * @returns The source HTML element
     */
    getSourceElement(mesh: PIXI.Sprite | SpriteMesh): HTMLImageElement | HTMLVideoElement | null;

    /**
     * Get the video element source corresponding to a Sprite or SpriteMesh.
     * @param object The PIXI source
     * @returns The source video element or null
     */
    getVideoSource(object: PIXI.Sprite | SpriteMesh | PIXI.Texture): HTMLVideoElement | null;

    /**
     * Clone a video texture so that it can be played independently of the original base texture.
     * @param {HTMLVideoElement} source     The video element source
     * @returns {Promise<PIXI.Texture>}     An unlinked PIXI.Texture which can be played independently
     */
    cloneTexture(source: HTMLVideoElement): Promise<PIXI.Texture>;

    /**
     * Check if a source has a video extension.
     * @param src The source.
     * @returns If the source has a video extension or not.
     */
    static hasVideoExtension(src: string): src is VideoFilePath;

    /**
     * Play a single video source
     * If playback is not yet enabled, add the video to the pending queue
     * @param video        The VIDEO element to play
     * @param [options={}] Additional options for modifying video playback
     * @param [options.playing] Should the video be playing? Otherwise, it will be paused
     * @param [options.loop]    Should the video loop?
     * @param [options.offset]  A specific timestamp between 0 and the video duration to begin playback
     * @param [options.volume]  Desired volume level of the video's audio channel (if any)
     */
    play(video: HTMLVideoElement, options?: VideoPlayOptions): Promise<void>;

    /**
     * Stop a single video source
     * @param video The VIDEO element to stop
     */
    stop(video: HTMLVideoElement): void;

    /**
     * Register an event listener to await the first mousemove gesture and begin playback once observed
     * A user interaction must involve a mouse click or keypress.
     * Listen for any of these events, and handle the first observed gesture.
     */
    awaitFirstGesture(): void;

    /**
     * Handle the first observed user gesture
     * We need a slight delay because unfortunately Chrome is stupid and doesn't always acknowledge the gesture fast enough.
     * @param event The mouse-move event which enables playback
     */
    protected _onFirstGesture(event: Event): void;

    /**
     * Create and cache a static thumbnail to use for the video.
     * The thumbnail is cached using the video file path or URL.
     * @param src     The source video URL
     * @param options Thumbnail creation options, including width and height
     * @return The created and cached base64 thumbnail image, or a placeholder image if the canvas is
     *         disabled and no thumbnail can be generated.
     */
    createThumbnail(src: string, options: CreateThumbnailOptions): Promise<string>;
}

interface VideoPlayOptions {
    playing?: boolean;
    loop?: boolean;
    offset?: number;
    volume?: number;
}

interface CreateThumbnailOptions {
    width: number;
    height: number;
    tx?: number;
    ty?: number;
    center?: boolean;
    format?: ImageFileExtension;
    quality?: number;
}
