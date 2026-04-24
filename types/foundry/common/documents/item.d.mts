import { ImageFilePath } from "@common/constants.mjs";
import * as abstract from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseActiveEffect, BaseActor, BaseFolder, BaseUser, ItemUUID } from "./_module.mjs";

/**
 * The Item Document.
 * Defines the DataSchema and common behaviors for a Item which are shared between both client and server.
 * @category Documents
 */
export default class BaseItem<TParent extends BaseActor | null = BaseActor | null> extends abstract.Document<
    TParent,
    ItemSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<ItemMetadata>;

    static override defineSchema(): ItemSchema;

    /** The default icon used for newly created Item documents */
    static DEFAULT_ICON: ImageFilePath;

    /**
     * Determine default artwork based on the provided item data.
     * @param itemData The source item data.
     * @returns Candidate item image.
     */
    static getDefaultArtwork(itemData: ItemSource): { img: ImageFilePath };

    override getUserLevel(user: BaseUser): CONST.DocumentOwnershipNumber;

    static override canUserCreate(user: BaseUser): boolean;
}

export default interface BaseItem<TParent extends BaseActor | null = BaseActor | null>
    extends abstract.Document<TParent, ItemSchema>, fields.ModelPropsFromSchema<ItemSchema> {
    get documentName(): ItemMetadata["name"];

    readonly effects: abstract.EmbeddedCollection<BaseActiveEffect<this>>;
}

interface ItemMetadata extends abstract.DocumentClassMetadata {
    name: "Item";
    collection: "items";
    hasTypeData: true;
    baseTypeAllowed: false;
    indexed: true;
    compendiumIndexFields: ["_id", "name", "img", "type", "sort", "folder"];
    embedded: { ActiveEffect: "effects" };
    label: "DOCUMENT.Item";
    labelPlural: "DOCUMENT.Items";
}

export type ItemSchema<TType extends string = string, TSystemSource extends object = object> = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    type: fields.DocumentTypeField<TType, TType, true, false, true, BaseItem>;
    img: fields.FilePathField<ImageFilePath, ImageFilePath, false, true, true>;
    system: fields.TypeDataField<TSystemSource>;
    effects: fields.EmbeddedCollectionField<BaseActiveEffect<BaseItem<BaseActor | null>>>;
    folder: fields.ForeignDocumentField<BaseFolder>;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField<ItemUUID>;
};

export type ItemSource<TType extends string = string, TSystemSource extends object = object> = fields.SourceFromSchema<
    ItemSchema<TType, TSystemSource>
>;
