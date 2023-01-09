declare module foundry {
    module data {
        /**
         * The data schema for a Playlist document.
         * @see BasePlaylist
         * @property _id             The _id which uniquely identifies this Playlist document
         * @property name            The name of this playlist
         * @property sounds          A Collection of PlaylistSounds embedded documents which belong to this playlist
         * @property [mode=0]        The playback mode for sounds in this playlist
         * @property [playing=false] Is this playlist currently playing?
         * @property folder          The _id of a Folder which contains this playlist
         * @property [sort]          The numeric sort value which orders this playlist relative to its siblings
         * @property [permission]    An object which configures user permissions to this playlist
         * @property [flags={}]      An object of optional key/value flags
         */
        interface PlaylistSource {
            _id: string;
            name: string;
            sounds: PlaylistSoundSource[];
            mode: PlaylistMode;
            playing: boolean;
            fade: number;
            folder: string;
            sort: number;
            seed: number;
            permission: Record<string, DocumentOwnershipLevel>;
            flags: Record<string, unknown>;
        }

        class PlaylistData<
            TDocument extends documents.BasePlaylist = documents.BasePlaylist
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            sounds: abstract.EmbeddedCollection<documents.BasePlaylistSound>;
        }

        interface PlaylistData extends Omit<PlaylistSoundSource, "sounds"> {
            readonly _source: PlaylistSource;
        }
    }
}
