/**
 * The Collection of Playlist documents which exist within the active World.
 * This Collection is accessible within the Game object as game.playlists.
 *
 * @see {@link Playlist} The Playlist entity
 * @see {@link PlaylistDirectory} The PlaylistDirectory sidebar directory
 */
declare class Playlists extends WorldCollection<Playlist> {
    /** @override */
    constructor(data?: foundry.data.PlaylistSoundData[]);

    /** @override */
    static documentName: "Playlist";

    /** Return the subset of Playlist entities which are currently playing */
    get playing(): Playlist[];

    /** Perform one-time initialization to begin playback of audio */
    initialize(): void;

    /**
     * Handle changes to a Scene to determine whether to trigger changes to Playlist entities.
     * @param scene The Scene entity being updated
     * @param data  The incremental update data
     */
    protected _onChangeScene(scene: Scene, data: DocumentUpdateData): Promise<void>;
}
