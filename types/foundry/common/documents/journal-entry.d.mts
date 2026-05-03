import { Document, DocumentClassMetadata, EmbeddedCollection } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseFolder, BaseJournalEntryCategory, BaseJournalEntryPage } from "./_module.mjs";

/**
 * The JournalEntry Document.
 * Defines the DataSchema and common behaviors for a JournalEntry which are shared between both client and server.
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
    /** The _id which uniquely identifies this JournalEntry document */
    _id: fields.DocumentIdField;
    /** The name of this JournalEntry */
    name: fields.StringField<string, string, true, false, false>;
    /** An EmbeddedCollection of JournalEntryPage documents */
    pages: fields.EmbeddedCollectionField<BaseJournalEntryPage<BaseJournalEntry>>;
    /** The Folder which contains this JournalEntry */
    folder: fields.ForeignDocumentField<BaseFolder>;
    /** An EmbeddedCollection of JournalEntryCategory documents */
    categories: fields.EmbeddedCollectionField<BaseJournalEntryCategory<BaseJournalEntry>>;
    /** The numeric sort value which orders this JournalEntry relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this JournalEntry */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

export type JournalEntrySource = fields.SourceFromSchema<JournalEntrySchema>;
