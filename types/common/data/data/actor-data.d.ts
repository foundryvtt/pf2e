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
         * @property [permission] An object which configures user permissions to this Actor
         * @property [flags={}]   An object of optional key/value flags
         */
        interface ActorSource {
            _id: string;
            name: string;
            type: string;
            img: ImagePath;
            data: object;
            token: TokenSource;
            items: ItemSource[];
            effects: ActiveEffectSource[];
            folder: string | null;
            sort: number;
            permission: Record<string, PermissionLevel>;
            flags: Record<string, any>;
        }

        class ActorData<
            TDocument extends documents.BaseActor = documents.BaseActor,
            TItem extends documents.BaseItem = documents.BaseItem,
            TActiveEffect extends documents.BaseActiveEffect = documents.BaseActiveEffect,
        > extends abstract.DocumentData<TDocument> {
            /** @override */
            static defineSchema(): abstract.DocumentSchema;

            /** A Collection of Item embedded Documents */
            items: abstract.EmbeddedCollection<TItem>;

            /** A Collection of ActiveEffect embedded Documents */
            effects: abstract.EmbeddedCollection<TActiveEffect>;
        }

        interface ActorData extends Omit<ActorSource, '_id' | 'effects' | 'items'> {
            readonly _source: ActorSource;
        }
    }
}
