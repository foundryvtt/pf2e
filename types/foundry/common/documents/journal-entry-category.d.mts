import Document, { DocumentMetadata } from "../abstract/document.mjs";
import * as fields from "../data/fields.mjs";
import BaseJournalEntry from "./journal-entry.mjs";

/**
 * An embedded Document that represents a category in a JournalEntry.
 * Defines the DataSchema and common behaviors for a JournalEntryCategory which are shared between both client and
 * server.
 * @category Documents
 */
export default class BaseJournalEntryCategory<TParent extends BaseJournalEntry | null> extends Document<
    TParent,
    JournalEntryCategorySchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): JournalEntryCategoryMetadata;

    static override defineSchema(): JournalEntryCategorySchema;
}

interface JournalEntryCategoryMetadata extends DocumentMetadata {
    name: "JournalEntryCategory";
    collection: "categories";
    label: "DOCUMENT.JournalEntryCategory";
    labelPlural: "DOCUMENT.JournalEntryCategories";
    isEmbedded: true;
}

type JournalEntryCategorySchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, true>;
    sort: fields.IntegerSortField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export {};
