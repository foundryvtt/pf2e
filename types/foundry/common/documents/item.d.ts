import type { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/module.d.ts";
import type { ActiveEffectSource } from "./active-effect.d.ts";
import type { BaseActiveEffect, BaseActor, BaseUser } from "./module.d.ts";

/** The Item document model. */
export default class BaseItem<TParent extends BaseActor | null> extends Document<TParent> {
    name: string;
    sort: number;

    /** The default icon used for newly created Item documents */
    static DEFAULT_ICON: ImageFilePath;

    static override get metadata(): ItemMetadata;

    /** A Collection of ActiveEffect embedded Documents */
    readonly effects: EmbeddedCollection<BaseActiveEffect<this>>;

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
    }): this["system"];
}

export default interface BaseItem<TParent extends BaseActor | null> extends Document<TParent> {
    flags: ItemFlags;
    readonly _source: ItemSource;
    system: object;

    get documentName(): (typeof BaseItem)["metadata"]["name"];
}

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
 * @property [ownership] An object which configures user permissions to this Item
 * @property [flags={}]   An object of optional key/value flags
 */
type ItemSource<TType extends string = string, TSystemSource extends object = object> = {
    _id: string;
    name: string;
    type: TType;
    img: ImageFilePath;
    system: TSystemSource;
    effects: ActiveEffectSource[];
    folder?: string | null;
    sort: number;
    ownership: Record<string, DocumentOwnershipLevel>;
    flags: ItemFlags;
};

interface ItemFlags extends DocumentFlags {
    core?: {
        sourceId?: ItemUUID;
    };
    [key: string]: Record<string, unknown> | undefined;
}

interface ItemMetadata extends DocumentMetadata {
    name: "Item";
    collection: "items";
    label: "DOCUMENT.Item";
    embedded: {
        ActiveEffect: "effects";
    };
    isPrimary: true;
    hasSystemData: true;
    types: string[];
    permissions: Omit<DocumentMetadata["permissions"], "create"> & {
        create: "ITEM_CREATE";
    };
}
