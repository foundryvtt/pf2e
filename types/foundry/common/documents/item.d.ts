declare module foundry {
    module documents {
        /** The Item document model. */
        class BaseItem extends abstract.Document {
            sort: number;

            /** The default icon used for newly created Item documents */
            static DEFAULT_ICON: ImageFilePath;

            static override get schema(): ConstructorOf<data.ItemData<BaseItem, BaseActiveEffect>>;

            static override get metadata(): ItemMetadata;

            /** A reference to the Collection of ActiveEffect instances in the Item document, indexed by _id. */
            get effects(): this["data"]["effects"];

            override canUserModify(user: BaseUser, action: UserAction, data?: DocumentUpdateData<this>): boolean;

            override testUserPermission(
                user: BaseUser,
                permission: DocumentOwnershipString | DocumentOwnershipLevel,
                { exact }?: { exact?: boolean }
            ): boolean;

            /**
             * Migrate the system data object to conform to data model defined by the current system version.
             * @see mergeObject
             * @param options Options which customize how the system data is migrated.
             * @param options.insertKeys   Retain keys which exist in the current data, but not the model
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
        }

        interface BaseItem {
            readonly data: data.ItemData<BaseItem, BaseActiveEffect>;

            /** Shim for V10 preparation */
            readonly system: this["data"]["system"];

            readonly parent: BaseActor | null;

            get documentName(): (typeof BaseItem)["metadata"]["name"];
        }

        interface ItemMetadata extends abstract.DocumentMetadata {
            name: "Item";
            collection: "items";
            label: "DOCUMENT.Item";
            embedded: {
                ActiveEffect: typeof BaseActiveEffect;
            };
            isPrimary: true;
            hasSystemData: true;
            types: string[];
            permissions: Omit<abstract.DocumentMetadata["permissions"], "create"> & {
                create: "ITEM_CREATE";
            };
        }
    }
}
