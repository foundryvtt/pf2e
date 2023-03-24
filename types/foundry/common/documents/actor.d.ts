declare module foundry {
    module documents {
        /**
         * The Actor document model.
         * @param    data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseActor<TParent extends BaseToken | null = BaseToken | null> extends abstract.Document<TParent> {
            prototypeToken: data.PrototypeToken;

            /** The default icon used for newly created Actor documents */
            static DEFAULT_ICON: ImageFilePath;

            static override get metadata(): ActorMetadata;

            /** A Collection of Item embedded Documents */
            readonly items: abstract.EmbeddedCollection<BaseItem<this>>;

            /** A Collection of ActiveEffect embedded Documents */
            readonly effects: abstract.EmbeddedCollection<BaseActiveEffect<this>>;

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
            }): this["system"];

            protected override _preCreate(
                data: PreDocumentId<this["_source"]>,
                options: DocumentModificationContext<TParent>,
                user: BaseUser
            ): Promise<void>;

            protected override _preUpdate(
                changed: DocumentUpdateData<this>,
                options: DocumentModificationContext<TParent>,
                user: BaseUser
            ): Promise<void>;
        }

        interface BaseActor<TParent extends BaseToken | null = BaseToken | null> extends abstract.Document<TParent> {
            flags: ActorFlags;
            readonly _source: ActorSource;
            system: object;

            get documentName(): (typeof BaseActor)["metadata"]["name"];
        }

        /**
         * The data schema for a Actor document.
         * @see BaseActor
         *
         * @param data Initial data used to construct the data object
         * @param [document] The document to which this data object belongs
         *
         * @property _id          The _id which uniquely identifies this Actor document
         * @property name         The name of this Actor
         * @property type         An Actor subtype which configures the system data model applied
         * @property [img]        An image file path which provides the artwork for this Actor
         * @property [data]       The system data object which is defined by the system template.json model
         * @property [token]      Default Token settings which are used for Tokens created from this Actor
         * @property items        A Collection of Item embedded Documents
         * @property effects      A Collection of ActiveEffect embedded Documents
         * @property folder       The _id of a Folder which contains this Actor
         * @property [sort]       The numeric sort value which orders this Actor relative to its siblings
         * @property [ownership] An object which configures user permissions to this Actor
         * @property [flags={}]   An object of optional key/value flags
         */
        interface ActorSource<
            TType extends string = string,
            TSystemSource extends object = object,
            TItemSource extends ItemSource = ItemSource
        > {
            _id: string;
            name: string;
            type: TType;
            img: ImageFilePath;
            system: TSystemSource;
            prototypeToken: data.PrototypeTokenSource;
            items: TItemSource[];
            effects: ActiveEffectSource[];
            folder: string | null;
            sort: number;
            ownership: Record<string, DocumentOwnershipLevel>;
            flags: ActorFlags;
        }

        interface ActorFlags extends DocumentFlags {
            core?: {
                sourceId?: ActorUUID;
            };
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
