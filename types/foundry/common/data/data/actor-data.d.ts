declare module foundry {
    module data {
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
            prototypeToken: PrototypeTokenSource;
            items: TItemSource[];
            effects: ActiveEffectSource[];
            folder: string | null;
            sort: number;
            ownership: Record<string, DocumentOwnershipLevel>;
            flags: ActorFlags;
        }

        class ActorData<
            TDocument extends documents.BaseActor,
            TActiveEffect extends documents.BaseActiveEffect,
            TItem extends documents.BaseItem
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            /** A Collection of ActiveEffect embedded Documents */
            effects: abstract.EmbeddedCollection<TActiveEffect>;

            /** A Collection of Item embedded Documents */
            items: abstract.EmbeddedCollection<TItem>;

            protected override _initializeSource(data: ActorSource): this["_source"];

            protected override _initialize(): void;
        }

        interface ActorData<
            TDocument extends documents.BaseActor,
            TActiveEffect extends documents.BaseActiveEffect,
            TItem extends documents.BaseItem
        > extends Omit<ActorSource, "effects" | "flags" | "items" | "token"> {
            readonly _source: ActorSource;
        }

        interface ActorFlags {
            core?: {
                sourceId?: ActorUUID;
            };
            [key: string]: Record<string, unknown> | undefined;
        }
    }
}
