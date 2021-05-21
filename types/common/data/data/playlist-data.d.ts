declare module foundry {
    module data {
        interface PlaylistSource {
            mode: number;
            playing: boolean;
            sort: number;
            folder?: string | null;
            sounds: PlaylistSoundSource[];
        }

        class PlaylistData<
            TDocument extends documents.BasePlaylist = documents.BasePlaylist
        > extends abstract.DocumentData<TDocument> {
            /** @override */
            static defineSchema(): abstract.DocumentSchema;

            sounds: abstract.EmbeddedCollection<documents.BasePlaylistSound>;
        }

        interface PlaylistData extends Omit<PlaylistSoundSource, '_id' | 'sounds'> {
            _source: PlaylistSource;
        }
    }
}
