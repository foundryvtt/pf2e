import ApplicationV2 from "@client/applications/api/application.mjs";
import Application from "@client/appv1/api/application-v1.mjs";
import Sound from "@client/audio/sound.mjs";
import { DatabaseDeleteCallbackOptions, DatabaseUpdateCallbackOptions } from "@common/abstract/_module.mjs";
import { BasePlaylistSound, BaseUser, Playlist } from "./_module.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";

interface CanvasBasePlaylistSoundStatic extends Omit<typeof BasePlaylistSound, "new">, ClientDocumentStatic {}

declare const ClientBasePlaylistSound: {
    new <TParent extends Playlist | null>(...args: any): BasePlaylistSound<TParent> & ClientDocument<TParent>;
} & CanvasBasePlaylistSoundStatic;

interface ClientBasePlaylistSound<TParent extends Playlist | null>
    extends InstanceType<typeof ClientBasePlaylistSound<TParent>> {}

/**
 * The client-side PlaylistSound document which extends the common BasePlaylistSound model.
 * Each PlaylistSound belongs to the sounds collection of a Playlist document.
 *
 * @see {@link foundry.documents.Playlist}: The Playlist document which contains PlaylistSound embedded
 *   documents
 * @see {@link foundry.applications.sheets.PlaylistSoundConfig}: The PlaylistSound configuration
 *   application
 * @see {@link foundry.audio.Sound}   The Sound API which manages web audio playback
 */
export default class PlaylistSound<
    TParent extends Playlist | null = Playlist | null,
> extends ClientBasePlaylistSound<TParent> {
    /**
     * The debounce tolerance for processing rapid volume changes into database updates in milliseconds
     */
    static VOLUME_DEBOUNCE_MS: number;

    /**
     * The Sound which manages playback for this playlist sound.
     * The Sound is created lazily when playback is required.
     */
    sound: Sound | null;

    /**
     * A debounced function, accepting a single volume parameter to adjust the volume of this sound
     * @type {(volume: number) => void}
     */
    debounceVolume: (volume: number) => void;

    /**
     * Create a Sound used to play this PlaylistSound document
     */
    protected _createSound(): Sound;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Determine the fade duration for this PlaylistSound based on its own configuration and that of its parent.
     */
    get fadeDuration(): number;

    /**
     * The audio context within which this sound is played.
     * This will be undefined if the audio context is not yet active.
     */
    get context(): AudioContext | undefined;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Synchronize playback for this particular PlaylistSound instance.
     */
    sync(): void;

    /**
     * Load the audio for this sound for the current client.
     */
    load(): Promise<void>;

    override toAnchor(options?: { classes?: string[] }): HTMLAnchorElement;

    protected override _onClickDocumentLink(event: PointerEvent): Application | Promise<ApplicationV2>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _preUpdate(
        changes: Record<string, unknown>,
        options: DatabaseUpdateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    protected _onUpdate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;

    /**
     * Special handling that occurs when playback of a PlaylistSound is started.
     */
    protected _onStart(): void;

    /**
     * Special handling that occurs when a PlaylistSound reaches the natural conclusion of its playback.
     */
    protected _onEnd(): Promise<void>;

    /**
     * Special handling that occurs when a PlaylistSound is manually stopped before its natural conclusion.
     * @protected
     */
    protected _onStop(): Promise<void>;
}
