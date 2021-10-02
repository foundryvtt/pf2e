declare module foundry {
    module data {
        /**
         * The data schema for a Item document.
         * @see BaseItem
         *
         * @param data Initial data used to construct the data object
         * @param [document] The document to which this data object belongs
         *
         * @property _id          The _id which uniquely identifies this Item document
         * @property name         The name of this Item
         * @property type         An Item subtype which configures the system data model applied
         * @property [img]        An image file path which provides the artwork for this Item
         * @property [data]       The system data object which is defined by the system template.json model
         * @property folder       The _id of a Folder which contains this Item
         * @property [sort]       The numeric sort value which orders this Item relative to its siblings
         * @property [permission] An object which configures user permissions to this Item
         * @property [flags={}]   An object of optional key/value flags
         */
        interface ItemSource {
            _id: string;
            name: string;
            type: string;
            img: ImagePath;
            data: object;
            effects: ActiveEffectSource[];
            folder?: string | null;
            sort: number;
            permission: Record<string, PermissionLevel>;
            flags: ItemFlags;
        }

        class ItemData<
            TDocument extends documents.BaseItem,
            TActiveEffect extends documents.BaseActiveEffect
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): {
                _id: typeof fields.DOCUMENT_ID;
                name: typeof fields.REQUIRED_STRING;
                type: {
                    type: typeof String;
                    required: true;
                    validate: (t: string) => boolean;
                    validationError: "The provided Item type must be in the array of types defined by the game system";
                };
                img: typeof fields.IMAGE_FIELD;
                data: typeof fields.OBJECT_FIELD;
                effects: {
                    type: {
                        ActiveEffect: typeof documents.BaseActiveEffect;
                    };
                    required: true;
                    default: never[];
                    isCollection: true;
                };
                folder: fields.ForeignDocumentField<{ type: typeof documents.BaseFolder }>;
                sort: typeof fields.INTEGER_SORT_FIELD;
                permission: typeof fields.DOCUMENT_PERMISSIONS;
                flags: typeof fields.OBJECT_FIELD;
            };

            /** The default icon used for newly created Item documents */
            static DEFAULT_ICON: ImagePath;

            protected override _initializeSource(data: this["_source"]): this["_source"];

            /** A collection of ActiveEffect embedded Documents */
            effects: abstract.EmbeddedCollection<TActiveEffect>;
        }

        interface ItemData<TDocument extends documents.BaseItem, TActiveEffect extends documents.BaseActiveEffect>
            extends Omit<ItemSource, "effects"> {
            readonly _source: ItemSource;

            get schema(): ReturnType<typeof ItemData["defineSchema"]>;
        }

        namespace ItemData {
            const schema: ReturnType<typeof ItemData["defineSchema"]>;
        }

        interface ItemFlags {
            core?: {
                sourceId: ItemUUID;
            };
            [key: string]: Record<string, unknown> | undefined;
        }
    }
}
