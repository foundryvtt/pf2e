declare module foundry {
    module documents {
        /** The FogExploration Document model. */
        class BaseFogExploration extends foundry.abstract.Document {
            static override get schema(): typeof data.FogExplorationData;

            static override get metadata(): FogExplorationMetadata;

            protected override _preUpdate(
                changed: DocumentUpdateData<this>,
                options: DocumentModificationContext,
                user: BaseUser
            ): Promise<void>;

            /** Test whether a User can modify a FogExploration document. */
            protected static _canUserModify<T extends BaseFogExploration>(user: BaseUser, doc: T): boolean;
        }

        interface BaseFogExploration {
            readonly data: data.FogExplorationData<this>;

            readonly parent: null;
        }

        interface FogExplorationMetadata extends abstract.DocumentMetadata {
            name: "DogExploration";
            collection: "fog";
            label: "DOCUMENT.FogExploration";
            isPrimary: true;
            permissions: {
                create: "PLAYER";
                update: typeof BaseFogExploration["_canUserModify"];
                delete: typeof BaseFogExploration["_canUserModify"];
            };
        }
    }
}
