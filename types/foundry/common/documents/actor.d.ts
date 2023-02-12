declare module foundry {
    module documents {
        /**
         * The Actor document model.
         * @param    data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseActor extends abstract.Document {
            prototypeToken: foundry.data.PrototypeToken;

            /** The default icon used for newly created Actor documents */
            static DEFAULT_ICON: ImageFilePath;

            static override get schema(): ConstructorOf<data.ActorData<BaseActor, BaseActiveEffect, BaseItem>>;

            static override get metadata(): ActorMetadata;

            /** A Collection of Item embedded Documents */
            readonly items: abstract.EmbeddedCollection<documents.BaseItem>;

            /** A Collection of ActiveEffect embedded Documents */
            readonly effects: abstract.EmbeddedCollection<documents.BaseActiveEffect>;

            /**
             * Migrate the system data object to conform to data model defined by the current system version.
             * @see mergeObject
             * @param options Options which customize how the system data is migrated.
             * @param options.insertKeys Retain keys which exist in the current data, but not the model
             * @param options.insertValues Retain inner-object values which exist in the current data, but not the model
             * @param options.enforceTypes Require that data types match the model exactly to be retained
             * @return The migrated system data object, not yet saved to the database
             */
            migrateSystemData({
                insertKeys,
                insertValues,
                enforceTypes,
            }?: {
                insertKeys?: boolean;
                insertValues?: boolean;
                enforceTypes?: boolean;
            }): this["data"]["system"];

            protected override _preCreate(
                data: PreDocumentId<this["_source"]>,
                options: DocumentModificationContext,
                user: BaseUser
            ): Promise<void>;

            protected override _preUpdate(
                changed: DocumentUpdateData<BaseActor>,
                options: DocumentModificationContext,
                user: BaseUser
            ): Promise<void>;
        }

        interface BaseActor {
            readonly data: data.ActorData<BaseActor, BaseActiveEffect, BaseItem>;

            readonly parent: BaseToken | null;

            // V10 shim
            readonly system: this["data"]["system"];

            get documentName(): (typeof BaseActor)["metadata"]["name"];
        }

        interface ActorMetadata extends abstract.DocumentMetadata {
            name: "Actor";
            collection: "actors";
            label: "DOCUMENT.Actor";
            embedded: {
                ActiveEffect: typeof BaseActiveEffect;
                Item: typeof BaseItem;
            };
            isPrimary: true;
            hasSystemData: true;
            permissions: {
                create: "ACTOR_CREATE";
                update: "ASSISTANT";
                delete: "ASSISTANT";
            };
            types: string[];
        }
    }
}
