import { ImageFilePath } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import * as documents from "./_module.mjs";

/**
 * The Adventure Document.
 * Defines the DataSchema and common behaviors for an Adventure which are shared between both client and server.
 */
export default class BaseAdventure extends Document<null, AdventureSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<AdventureMetadata>;

    static override defineSchema(): AdventureSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /* -------------------------------------------- */
    /*  Model Properties                            */
    /* -------------------------------------------- */

    /** An array of the fields which provide imported content from the Adventure.*/
    static get contentFields(): Record<string, typeof Document>;

    /** Provide a thumbnail image path used to represent the Adventure document. */
    get thumbnail(): string;
}

export default interface BaseAdventure
    extends Document<null, AdventureSchema>, fields.ModelPropsFromSchema<AdventureSchema> {
    get documentName(): AdventureMetadata["name"];
}

interface AdventureMetadata extends DocumentClassMetadata {
    name: "Adventure";
    collection: "adventures";
    compendiumIndexFields: ["_id", "name", "caption", "description", "img", "sort", "folder", "flags.core.sheetClass"];
    label: "DOCUMENT.Adventure";
    labelPlural: "DOCUMENT.Adventures";
}

type AdventureSchema = {
    /** The _id which uniquely identifies this Adventure document */
    _id: fields.DocumentIdField;
    /** The name of this Adventure */
    name: fields.StringField<string, string, true, false, false>;
    /** An image file path which provides the artwork for this Adventure */
    img: fields.FilePathField<ImageFilePath>;
    /** The caption displayed under the primary image banner */
    caption: fields.HTMLField;
    /** The description for this Adventure */
    description: fields.HTMLField;
    /** An array of Actor documents which are included in this Adventure */
    actors: fields.SetField<fields.EmbeddedDataField<documents.BaseActor<null>>>;
    /** An array of Combat documents which are included in this Adventure */
    combats: fields.SetField<fields.EmbeddedDataField<documents.BaseCombat>>;
    /** An array of Item documents which are included in this Adventure */
    items: fields.SetField<fields.EmbeddedDataField<documents.BaseItem<null>>>;
    /** An array of JournalEntry documents which are included in this Adventure */
    journal: fields.SetField<fields.EmbeddedDataField<documents.BaseJournalEntry>>;
    /** An array of Scene documents which are included in this Adventure */
    scenes: fields.SetField<fields.EmbeddedDataField<documents.BaseScene>>;
    /** An array of RollTable documents which are included in this Adventure */
    tables: fields.SetField<fields.EmbeddedDataField<documents.BaseRollTable>>;
    /** An array of Macro documents which are included in this Adventure */
    macros: fields.SetField<fields.EmbeddedDataField<documents.BaseMacro>>;
    /** An array of Cards documents which are included in this Adventure */
    cards: fields.SetField<fields.EmbeddedDataField<documents.BaseCards>>;
    /** An array of Playlist documents which are included in this Adventure */
    playlists: fields.SetField<fields.EmbeddedDataField<documents.BasePlaylist>>;
    /** An array of Folder documents which are included in this Adventure */
    folders: fields.SetField<fields.EmbeddedDataField<documents.BaseFolder>>;
    /** The Folder which contains this Adventure */
    folder: fields.ForeignDocumentField<documents.BaseFolder>;
    /** The numeric sort valute which orders this Adventure relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

export type AdventureSource = fields.SourceFromSchema<AdventureSchema>;
