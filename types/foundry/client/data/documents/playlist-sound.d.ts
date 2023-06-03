import type { ClientBasePlaylistSound } from "./client-base-mixes.d.ts";

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
    class PlaylistSound<TParent extends Playlist | null> extends ClientBasePlaylistSound<TParent> {
        constructor(
            data: PreCreate<foundry.documents.PlaylistSoundSource>,
            context?: DocumentConstructionContext<TParent>
        );

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

    /** @todo: fill in */
    class Sound {}
}
