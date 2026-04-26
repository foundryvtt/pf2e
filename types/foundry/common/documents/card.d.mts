import { ImageFilePath, VideoFilePath } from "@common/constants.mjs";
import Document from "../abstract/document.mjs";
import * as fields from "../data/fields.mjs";
import { BaseCards } from "./_module.mjs";
import { DocumentClassMetadata } from "@common/abstract/_module.mjs";

/**
 * The Card Document.
 * Defines the DataSchema and common behaviors for a Card which are shared between both client and server.
 */
export default class BaseCard<TParent extends BaseCards | null = BaseCards | null> extends Document<
    TParent,
    CardSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<CardMetadata>;

    static override defineSchema(): CardSchema;

    /** The default icon used for a Card face that does not have a custom image set */
    static DEFAULT_ICON: ImageFilePath | VideoFilePath;

    static override LOCALIZATION_PREFIXES: string[];
}

export default interface BaseCard<TParent extends BaseCards | null = BaseCards | null>
    extends Document<TParent, CardSchema>, fields.ModelPropsFromSchema<CardSchema> {
    get documentName(): CardMetadata["name"];
}

interface CardMetadata extends DocumentClassMetadata {
    name: "Card";
    collection: "cards";
    hasTypeData: true;
    baseTypeAllowed: true;
    indexed: true;
    label: "DOCUMENT.Card";
    labelPlural: "DOCUMENT.CardPlural";
    compendiumIndexFields: ["name", "type", "suit", "sort"];
}

type CardSchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    description: fields.HTMLField;
    type: fields.DocumentTypeField<string, string, true, false, true, BaseCard>;
    system: fields.TypeDataField;
    suit: fields.StringField<string, string, true>;
    value: fields.NumberField;
    back: fields.SchemaField<CardFaceSchema>;
    faces: fields.ArrayField<fields.SchemaField<CardFaceSchema>>;
    face: fields.NumberField<number, number, true>;
    drawn: fields.BooleanField;
    origin: fields.ForeignDocumentField<BaseCards>;
    width: fields.NumberField;
    height: fields.NumberField;
    rotation: fields.AngleField;
    sort: fields.IntegerSortField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

type CardFaceSchema = {
    name: fields.StringField<string, string, false, false, true>;
    text: fields.HTMLField;
    img: fields.FilePathField<ImageFilePath | VideoFilePath>;
};

export type CardFaceData = fields.ModelPropsFromSchema<CardFaceSchema>;
