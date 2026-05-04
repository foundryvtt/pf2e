import { ImageFilePath, TextAnchorPoint } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as data from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import { BaseScene, BaseUser } from "./_module.mjs";

/**
 * The Note Document.
 * Defines the DataSchema and common behaviors for a Note which are shared between both client and server.
 */
export default class BaseNote<TParent extends BaseScene | null = BaseScene | null> extends Document<
    TParent,
    NoteSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<NoteMetadata>;

    static override defineSchema(): NoteSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /** The default icon used for newly created Note documents. */
    static DEFAULT_ICON: ImageFilePath;

    /* -------------------------------------------- */
    /*  Model Methods                               */
    /* -------------------------------------------- */

    static override canUserCreate(user: BaseUser): boolean;

    override getUserLevel(user: BaseUser): CONST.DocumentOwnershipNumber;
}

export default interface BaseNote<TParent extends BaseScene | null = BaseScene | null>
    extends Document<TParent, NoteSchema>, fields.ModelPropsFromSchema<NoteSchema> {
    get documentName(): NoteMetadata["name"];
}

interface NoteMetadata extends DocumentClassMetadata {
    name: "Note";
    collection: "notes";
    label: "DOCUMENT.Note";
    labelPlural: "DOCUMENT.Notes";
}

type NoteSchema = {
    /** The _id which uniquely identifies this BaseNote embedded document */
    _id: fields.DocumentIdField;
    author: fields.DocumentAuthorField<BaseUser>;
    /** The _id of a JournalEntry document which this Note represents */
    entryId: fields.ForeignDocumentField<string>;
    /** The _id of a specific JournalEntryPage document which this Note represents */
    pageId: fields.ForeignDocumentField<string>;
    /** The x-coordinate position of the center of the note icon */
    x: fields.NumberField<number, number, true, false, true>;
    /** The y-coordinate position of the center of the note icon */
    y: fields.NumberField<number, number, true, false, true>;
    /** The elevation */
    elevation: fields.NumberField<number, number, true, false, true>;
    levels: fields.SceneLevelsSetField;
    /** The sort order */
    sort: fields.NumberField<number, number, true, false, true>;
    locked: fields.BooleanField;
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
    flags: fields.DocumentFlagsField;
};

export type NoteSource = fields.SourceFromSchema<NoteSchema>;
