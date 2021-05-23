declare module foundry {
    module documents {
        /** The Playlist document model. */
        class BasePlaylist extends abstract.Document {
            /** @override */
            static get schema(): new (...args: any[]) => data.PlaylistData;

            /** @override */
            static get metadata(): PlaylistMetadata;

            /** A reference to the Collection of PlaylistSound instances in the Playlist document, indexed by _id. */
            get sounds(): this['data']['sounds'];
        }

        interface BasePlaylist {
            readonly data: data.PlaylistData<BasePlaylist>;
        }

        interface PlaylistMetadata extends abstract.DocumentMetadata {
            name: 'Playlist';
            collection: 'playlists';
            label: 'DOCUMENT.Playlist';
            embedded: {
                PlaylistSound: typeof BasePlaylistSound;
            };
            isPrimary: true;
        }
    }
}
