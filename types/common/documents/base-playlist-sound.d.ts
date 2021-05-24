declare module foundry {
    module documents {
        /** The PlaylistSound document model. */
        class BasePlaylistSound extends abstract.Document {
            /** @override */
            static get schema(): typeof data.PlaylistSoundData;

            /** @override */
            static get metadata(): PlaylistSoundMetadata;

            /** @override */
            testUserPermission(
                user: documents.BaseUser,
                permission: DocumentPermission | UserAction,
                { exact }?: { exact?: boolean },
            ): boolean;
        }

        interface BasePlaylistSound {
            readonly data: data.PlaylistSoundData<BasePlaylistSound>;
        }

        interface PlaylistSoundMetadata extends abstract.DocumentMetadata {
            name: 'PlaylistSound';
            collection: 'sounds';
            label: 'DOCUMENT.PlaylistSound';
            isEmbedded: true;
        }
    }
}
