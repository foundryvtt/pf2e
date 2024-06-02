import type Document from "../abstract/document.d.ts";
import type { DocumentMetadata } from "../abstract/document.d.ts";
import type * as fields from "../data/fields.d.ts";
import type * as documents from "./module.d.ts";

/**
 * The Document definition for a Card.
 * Defines the DataSchema and common behaviors for a Card which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the Card
 * @param context Construction context options
 */
export default class BaseCard<TParent extends documents.BaseCards | null> extends Document<TParent, CardSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): CardMetadata;

    static override defineSchema(): CardSchema;

    /** The default icon used for a Card face that does not have a custom image set */
    static DEFAULT_ICON: ImageFilePath | VideoFilePath;

    /** The allowed set of Card types which may exist */
    static get TYPES(): string[];

    /* -------------------------------------------- */
    /*  Model Methods                               */
    /* -------------------------------------------- */

    override testUserPermission(
        user: documents.BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean | undefined },
    ): boolean;
}

export default interface BaseCard<TParent extends documents.BaseCards | null>
    extends Document<TParent, CardSchema>,
        ModelPropsFromSchema<CardSchema> {
    get documentName(): CardMetadata["name"];
}

interface CardMetadata extends DocumentMetadata {
    name: "Card";
    collection: "cards";
    indexed: true;
    label: "DOCUMENT.Card";
    labelPlural: "DOCUMENT.Cards";
}

type CardSchema = {
    /** The _id which uniquely identifies this Card document */
    _id: fields.DocumentIdField;
    /** The text name of this card */
    name: fields.StringField<string, string, true, false, false>;
    /** A text description of this card which applies to all faces */
    description: fields.HTMLField;
    /** A category of card (for example, a suit) to which this card belongs */
    type: fields.StringField<string, string, true, false, false>;
    /** Game system data which is defined by the system template.json model */
    system: fields.TypeDataField;
    /** An optional suit designation which is used by default sorting */
    suit: fields.StringField;
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
    origin: fields.ForeignDocumentField<documents.BaseCards>;
    /** The visible width of this card */
    width: fields.NumberField;
    /** The visible height of this card */
    height: fields.NumberField;
    /** The angle of rotation of this card */
    rotation: fields.AngleField;
    /** The sort order of this card relative to others in the same stack */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
};

type CardFaceSchema = {
    /** A name for this card face */
    name: fields.StringField<string, string, false, false, true>;
    /** Displayed text that belongs to this face */
    text: fields.HTMLField;
    /** A displayed image or video file which depicts the face */
    img: fields.FilePathField<ImageFilePath | VideoFilePath>;
};

export type CardFaceData = ModelPropsFromSchema<CardFaceSchema>;
