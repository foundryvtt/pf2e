declare module foundry {
    module documents {
        /**
         * The Folder Document model.
         *
         * @param data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseFolder extends abstract.Document {
            static override get schema(): typeof data.FolderData;

            static override get metadata(): FolderMetadata;
        }

        interface BaseFolder {
            readonly data: data.FolderData<this>;

            readonly parent: null;
        }

        interface FolderMetadata extends abstract.DocumentMetadata {
            name: 'Folder';
            collection: 'folders';
            label: 'DOCUMENT.Folder';
            isPrimary: true;
            types: typeof CONST.FOLDER_ENTITY_TYPES;
        }
    }
}
