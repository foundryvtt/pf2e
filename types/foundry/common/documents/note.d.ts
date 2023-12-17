import type { Document, DocumentMetadata, MetadataPermission } from "../abstract/module.d.ts";
import type * as data from "../data/data.d.ts";
import type * as fields from "../data/fields.d.ts";
import type * as documents from "./module.d.ts";

/**
 * The Document definition for a Note.
 * Defines the DataSchema and common behaviors for a Note which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the Note
 * @param context Construction context options
 */
export default class BaseNote<TParent extends documents.BaseScene | null> extends Document<TParent, NoteSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): NoteMetadata;

    static override defineSchema(): NoteSchema;

    /** The default icon used for newly created Note documents. */
    static DEFAULT_ICON: ImageFilePath;

    /* -------------------------------------------- */
    /*  Model Methods                               */
    /* -------------------------------------------- */

    testUserPermission(
        user: documents.BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean },
    ): boolean;
}

export default interface BaseNote<TParent extends documents.BaseScene | null>
    extends Document<TParent, NoteSchema>,
        ModelPropsFromSchema<NoteSchema> {
    get documentName(): NoteMetadata["name"];
}

interface NoteMetadata extends DocumentMetadata {
    name: "Note";
    collection: "notes";
    label: "DOCUMENT.Note";
    labelPlural: "DOCUMENT.Notes";
    permissions: {
        create: "NOTE_CREATE";
        update: MetadataPermission;
        delete: MetadataPermission;
    };
}

type NoteSchema = {
    /** The _id which uniquely identifies this BaseNote embedded document */
    _id: fields.DocumentIdField;
    /** The _id of a JournalEntry document which this Note represents */
    entryId: fields.ForeignDocumentField<string>;
    /** The _id of a specific JournalEntryPage document which this Note represents */
    pageId: fields.ForeignDocumentField<string>;
    /** The x-coordinate position of the center of the note icon */
    x: fields.NumberField<number, number, true, false, true>;
    /** The y-coordinate position of the center of the note icon */
    y: fields.NumberField<number, number, true, false, true>;
    /** An image icon used to represent this note */
    texture: data.TextureData;
    /** The pixel size of the map note icon */
    iconSize: fields.NumberField<number, number, true, false, true>;
    /** Optional text which overrides the title of the linked Journal Entry */
    text: fields.StringField<string, string, false, false, true>;
    /** The font family used to display the text label on this note, defaults to CONFIG.defaultFontFamily */
    fontFamily: fields.StringField<string, string, true, false, true>;
    /** The font size used to display the text label on this note */
    fontSize: fields.NumberField<number, number, true, true, true>;
    /** A value in CONST.TEXT_ANCHOR_POINTS which defines where the text label anchors to the note icon. */
    textAnchor: fields.NumberField<TextAnchorPoint, TextAnchorPoint, true, false, true>;
    /** The string that defines the color with which the note text is rendered */
    textColor: fields.ColorField;
    /** Whether this map pin is globally visible or requires LoS to see. */
    global: fields.BooleanField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
};

type NoteSource = SourceFromSchema<NoteSchema>;
