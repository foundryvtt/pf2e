declare module foundry {
    module documents {
        /** The PlaylistSound document model. */
        class BasePlaylistSound extends abstract.Document {
            static override get schema(): typeof data.PlaylistSoundData;

            static override get metadata(): PlaylistSoundMetadata;

            testUserPermission(
                user: documents.BaseUser,
                permission: DocumentPermission | UserAction,
                { exact }?: { exact?: boolean },
            ): boolean;
        }

        interface BasePlaylistSound {
            readonly data: data.PlaylistSoundData<this>;

            readonly parent: BasePlaylist | null;
        }

        interface PlaylistSoundMetadata extends abstract.DocumentMetadata {
            name: 'PlaylistSound';
            collection: 'sounds';
            label: 'DOCUMENT.PlaylistSound';
            isEmbedded: true;
        }
    }
}
