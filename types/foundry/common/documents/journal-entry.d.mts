import { Document, DocumentClassMetadata, EmbeddedCollection } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseFolder, BaseJournalEntryCategory, BaseJournalEntryPage } from "./_module.mjs";

/**
 * The JournalEntry Document.
 * Defines the DataSchema and common behaviors for a JournalEntry which are shared between both client and server.
 * @category Documents
 */
export default class BaseJournalEntry extends Document<null, JournalEntrySchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<JournalEntryMetadata>;

    static override defineSchema(): JournalEntrySchema;

    static override LOCALIZATION_PREFIXES: string[];
}

export default interface BaseJournalEntry
    extends Document<null, JournalEntrySchema>, fields.ModelPropsFromSchema<JournalEntrySchema> {
    get documentName(): JournalEntryMetadata["name"];

    readonly pages: EmbeddedCollection<BaseJournalEntryPage<this>>;
    readonly categories: EmbeddedCollection<BaseJournalEntryCategory<this>>;
}

interface JournalEntryMetadata extends DocumentClassMetadata {
    name: "JournalEntry";
    collection: "journal";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "sort", "folder"];
    embedded: {
        JournalEntryCategory: "categories";
        JournalEntryPage: "pages";
    };
    label: "DOCUMENT.JournalEntry";
    labelPlural: "DOCUMENT.JournalEntries";
}

type JournalEntrySchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    pages: fields.EmbeddedCollectionField<BaseJournalEntryPage<BaseJournalEntry>>;
    folder: fields.ForeignDocumentField<BaseFolder>;
    categories: fields.EmbeddedCollectionField<BaseJournalEntryCategory<BaseJournalEntry>>;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type JournalEntrySource = fields.SourceFromSchema<JournalEntrySchema>;
