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
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    img: fields.FilePathField<ImageFilePath>;
    caption: fields.HTMLField;
    description: fields.HTMLField;
    actors: fields.SetField<fields.EmbeddedDataField<documents.BaseActor<null>>>;
    combats: fields.SetField<fields.EmbeddedDataField<documents.BaseCombat>>;
    items: fields.SetField<fields.EmbeddedDataField<documents.BaseItem<null>>>;
    journal: fields.SetField<fields.EmbeddedDataField<documents.BaseJournalEntry>>;
    scenes: fields.SetField<fields.EmbeddedDataField<documents.BaseScene>>;
    tables: fields.SetField<fields.EmbeddedDataField<documents.BaseRollTable>>;
    macros: fields.SetField<fields.EmbeddedDataField<documents.BaseMacro>>;
    cards: fields.SetField<fields.EmbeddedDataField<documents.BaseCards>>;
    playlists: fields.SetField<fields.EmbeddedDataField<documents.BasePlaylist>>;
    folders: fields.SetField<fields.EmbeddedDataField<documents.BaseFolder>>;
    folder: fields.ForeignDocumentField<documents.BaseFolder>;
    sort: fields.IntegerSortField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type AdventureSource = fields.SourceFromSchema<AdventureSchema>;
