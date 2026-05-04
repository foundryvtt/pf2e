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
    /** The human-readable name of the Adventure */
    name: fields.StringField<string, string, true, false, false>;
    /** The file path for the primary image of the adventure */
    img: fields.FilePathField<ImageFilePath>;
    /** A string caption displayed under the primary image banner */
    caption: fields.HTMLField;
    /** An HTML text description for the adventure */
    description: fields.HTMLField;
    /** An array of included Actor documents */
    actors: fields.SetField<fields.EmbeddedDataField<documents.BaseActor<null>>>;
    /** An array of included Combat documents */
    combats: fields.SetField<fields.EmbeddedDataField<documents.BaseCombat>>;
    /** An array of included Item documents */
    items: fields.SetField<fields.EmbeddedDataField<documents.BaseItem<null>>>;
    /** An array of included JournalEntry documents*/
    journal: fields.SetField<fields.EmbeddedDataField<documents.BaseJournalEntry>>;
    /** An array of included Scene documents */
    scenes: fields.SetField<fields.EmbeddedDataField<documents.BaseScene>>;
    /** An array of included RollTable documents */
    tables: fields.SetField<fields.EmbeddedDataField<documents.BaseRollTable>>;
    /** An array of included Macro documents */
    macros: fields.SetField<fields.EmbeddedDataField<documents.BaseMacro>>;
    /** An array of included Cards documents */
    cards: fields.SetField<fields.EmbeddedDataField<documents.BaseCards>>;
    /** An array of included Playlist documents */
    playlists: fields.SetField<fields.EmbeddedDataField<documents.BasePlaylist>>;
    /** An array of included Folder documents */
    folders: fields.SetField<fields.EmbeddedDataField<documents.BaseFolder>>;
    /** The _id of a Folder which contains this Adventure */
    folder: fields.ForeignDocumentField<documents.BaseFolder>;
    /** The sort order of this adventure relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

export type AdventureSource = fields.SourceFromSchema<AdventureSchema>;
