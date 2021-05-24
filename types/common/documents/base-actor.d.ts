declare module foundry {
    module documents {
        /**
         * The Actor document model.
         * @param    data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseActor<
            TActiveEffect extends BaseActiveEffect = BaseActiveEffect,
            TItem extends BaseItem = BaseItem,
        > extends abstract.Document {
            /** @override */
            static get schema(): new (...args: any[]) => data.ActorData;

            /** @override */
            static get metadata(): ActorMetadata;

            /**
             * A reference to the Collection of embedded ActiveEffect instances in the Actor document, indexed by _id.
             */
            get effects(): abstract.EmbeddedCollection<TActiveEffect>;

            /** A reference to the Collection of embedded Item instances in the Actor document, indexed by _id. */
            get items(): abstract.EmbeddedCollection<TItem>;

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
            }): this['data']['data'];

            /** @override */
            _preCreate(
                data: Partial<this['data']['_source']>,
                options: DocumentModificationContext,
                user: BaseUser,
            ): Promise<void>;

            /** @override */
            _preUpdate(
                changed: DocumentUpdateData<this>,
                options: DocumentModificationContext,
                user: BaseUser,
            ): Promise<void>;
        }

        interface BaseActor<
            TActiveEffect extends BaseActiveEffect = BaseActiveEffect,
            TItem extends BaseItem = BaseItem,
        > extends abstract.Document {
            readonly data: data.ActorData<BaseActor<TActiveEffect, TItem>>;
            readonly parent: BaseToken | null;
        }

        interface ActorMetadata extends abstract.DocumentMetadata {
            name: 'Actor';
            collection: 'actors';
            label: 'DOCUMENT.Actor';
            embedded: {
                ActiveEffect: typeof BaseActiveEffect;
                Item: typeof BaseItem;
            };
            isPrimary: true;
            hasSystemData: true;
            permissions: {
                create: 'ACTOR_CREATE';
                update: 'ASSISTANT';
                delete: 'ASSISTANT';
            };
            types: string[];
        }
    }
}
