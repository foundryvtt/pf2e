declare module foundry {
    module documents {
        /**The Wall embedded document model. */
        class BaseWall extends abstract.Document {
            /** @override */
            static get schema(): typeof data.WallData;

            /** @override */
            static get metadata(): WallMetadata;

            /** Is a user able to update an existing Wall? */
            protected static _canUpdate(user: BaseUser, doc: BaseWall, data: data.WallData): boolean;
        }

        interface BaseWall {
            readonly data: data.WallData<BaseWall>;
        }

        interface WallMetadata extends abstract.DocumentMetadata {
            name: 'Wall';
            collection: 'walls';
            label: 'DOCUMENT.Wall';
            isEmbedded: true;
            permissions: {
                create: 'ASSISTANT';
                update: typeof documents.BaseWall['_canUpdate'];
                delete: 'ASSISTANT';
            };
        }
    }
}
