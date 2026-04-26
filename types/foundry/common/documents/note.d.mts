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
    _id: fields.DocumentIdField;
    author: fields.DocumentAuthorField<BaseUser>;
    entryId: fields.ForeignDocumentField<string>;
    pageId: fields.ForeignDocumentField<string>;
    x: fields.NumberField<number, number, true, false, true>;
    y: fields.NumberField<number, number, true, false, true>;
    elevation: fields.NumberField<number, number, true, false, true>;
    levels: fields.SceneLevelsSetField;
    sort: fields.NumberField<number, number, true, false, true>;
    locked: fields.BooleanField;
    texture: data.TextureData;
    iconSize: fields.NumberField<number, number, true, false, true>;
    text: fields.StringField<string, string, false, false, true>;
    fontFamily: fields.StringField<string, string, true, false, true>;
    fontSize: fields.NumberField<number, number, true, true, true>;
    textAnchor: fields.NumberField<TextAnchorPoint, TextAnchorPoint, true, false, true>;
    textColor: fields.ColorField;
    global: fields.BooleanField;
    flags: fields.DocumentFlagsField;
};

export type NoteSource = fields.SourceFromSchema<NoteSchema>;
