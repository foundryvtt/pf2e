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
    /** The _id which uniquely identifies this Card document */
    _id: fields.DocumentIdField;
    /** The name of this Card */
    name: fields.StringField<string, string, true, false, false>;
    /** The description of this card which applies to all faces */
    description: fields.HTMLField;
    /** An Card subtype which configures the system data model applied */
    type: fields.DocumentTypeField<string, string, true, false, true, BaseCard>;
    /** They system data object which is defined by the system data model */
    system: fields.TypeDataField;
    /** An optional suit designation which is used by default sorting */
    suit: fields.StringField<string, string, true>;
    /** An optional numeric value of the card which is used by default sorting */
    value: fields.NumberField;
    /** An object of face data which describes the back of this card */
    back: fields.SchemaField<CardFaceSchema>;
    /** An array of face data which represent displayable faces of this card */
    faces: fields.ArrayField<fields.SchemaField<CardFaceSchema>>;
    /** The index of the currently displayed face, or null if the card is face-down */
    face: fields.NumberField<number, number, true>;
    /** Whether this card is currently drawn from its source deck */
    drawn: fields.BooleanField;
    /** The document ID of the origin deck to which this card belongs */
    origin: fields.ForeignDocumentField<BaseCards>;
    /** The visible width of this card */
    width: fields.NumberField;
    /** The visible height of this card */
    height: fields.NumberField;
    /** The angle of rotation of this card */
    rotation: fields.AngleField;
    /** The numeric sort valute which orders this Card relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

type CardFaceSchema = {
    name: fields.StringField<string, string, false, false, true>;
    text: fields.HTMLField;
    img: fields.FilePathField<ImageFilePath | VideoFilePath>;
};

export type CardFaceData = fields.ModelPropsFromSchema<CardFaceSchema>;
