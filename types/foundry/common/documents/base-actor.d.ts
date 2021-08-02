declare module foundry {
    module documents {
        /**
         * The Actor document model.
         * @param    data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseActor extends abstract.Document {
            static override get schema(): ConstructorOf<data.ActorData<BaseActor, BaseActiveEffect, BaseItem>>;

            static override get metadata(): ActorMetadata;

            /**
             * A reference to the Collection of embedded ActiveEffect instances in the Actor document, indexed by _id.
             */
            get effects(): this["data"]["effects"];

            /** A reference to the Collection of embedded Item instances in the Actor document, indexed by _id. */
            get items(): this["data"]["items"];

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
            }): this["data"]["data"];

            protected override _preCreate(
                data: PreDocumentId<this["data"]["_source"]>,
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
