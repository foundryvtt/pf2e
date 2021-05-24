import { PlaylistSoundConstructor } from './constructors';

declare global {
    /**
     * The PlaylistSound embedded document within a Playlist document which extends the BasePlaylist abstraction.
     * Each PlaylistSound belongs to the results collection of a Playlist entity.
     * Each PlaylistSound contains a PlaylistSoundData object which provides its source data.
     *
     * @see {@link data.PlaylistSoundData}    The PlaylistSound data schema
     * @see {@link documents.Playlist}        The Playlist document which contains PlaylistSound embedded documents
     * @see {@link Sound}                     The Sound API which manages web audio playback
     */
    class PlaylistSound extends PlaylistSoundConstructor {
        /** @override */
        constructor(data: Partial<foundry.data.PlaylistSoundSource>, context?: DocumentConstructorContext);

        /** The Sound which manages playback for this playlist sound */
        sound: Sound | null;

        /**
         * A debounced function, accepting a single volume parameter to adjust the volume of this sound
         * @param volume The desired volume level
         */
        debounceVolume: (volume: number) => unknown;

        /** The debounce tolerance for processing rapid volume changes into database updates in milliseconds */
        static VOLUME_DEBOUNCE_MS: number;

        /** @todo fill the rest of this in */
    }

    interface PlaylistSound {
        readonly data: foundry.data.PlaylistSoundData<PlaylistSound>;

        /** @param parent The parent Playlist document to which this result belongs */
        readonly parent: Playlist | null;
    }

    class Sound {}
}
