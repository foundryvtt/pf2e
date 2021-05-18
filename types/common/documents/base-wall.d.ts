declare module foundry {
    module documents {
        /**
         * The Wall embedded document model.
         * @param data Initial data from which to construct the embedded document.
         * @property data The constructed data object for the embedded document.
         */
        class BaseWall extends abstract.Document {
            /** @override */
            static get schema(): typeof data.WallData;

            /** @override */
            static get metadata(): WallMetadata;

            /** Is a user able to update an existing Wall? */
            protected static _canUpdate(user: BaseUser, doc: BaseWall, data: data.WallData): boolean;
        }
    }
}

interface WallMetadata extends foundry.abstract.DocumentMetadata {
    name: 'Wall';
    collection: 'walls';
    label: 'DOCUMENT.Wall';
    isEmbedded: true;
}
