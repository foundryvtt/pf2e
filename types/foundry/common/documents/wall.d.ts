declare module foundry {
    module documents {
        /** The Wall embedded document model. */
        class BaseWall<TParent extends BaseScene | null> extends abstract.Document<TParent> {
            static override get metadata(): WallMetadata;

            /** Is a user able to update an existing Wall? */
            protected static _canUpdate(user: BaseUser, doc: BaseWall<BaseScene | null>, data: WallSource): boolean;

            light: WallSenseType;
            move: WallSenseType;
            sight: WallSenseType;
            sound: WallSenseType;
        }

        interface BaseWall<TParent extends BaseScene | null> extends abstract.Document<TParent> {
            readonly _source: WallSource;
        }

        interface WallSource {
            c: number[];
            move?: number;
            sense?: number;
            dir?: number;
            door?: number;
            ds?: number;
        }

        interface WallMetadata extends abstract.DocumentMetadata {
            name: "Wall";
            collection: "walls";
            label: "DOCUMENT.Wall";
            isEmbedded: true;
            permissions: {
                create: "ASSISTANT";
                update: (typeof documents.BaseWall)["_canUpdate"];
                delete: "ASSISTANT";
            };
        }
    }
}
