import { DocumentClassMetadata } from "@common/abstract/_module.mjs";
import Document from "../abstract/document.mjs";
import * as fields from "../data/fields.mjs";
import BaseJournalEntry from "./journal-entry.mjs";

/**
 * An embedded Document that represents a category in a JournalEntry.
 * Defines the DataSchema and common behaviors for a JournalEntryCategory which are shared between both client and
 * server.
 */
export default class BaseJournalEntryCategory<
    TParent extends BaseJournalEntry | null = BaseJournalEntry | null,
> extends Document<TParent, JournalEntryCategorySchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<JournalEntryCategoryMetadata>;

    static override defineSchema(): JournalEntryCategorySchema;
}

export default interface BaseJournalEntryCategory<
    TParent extends BaseJournalEntry | null = BaseJournalEntry | null,
> extends Document<TParent, JournalEntryCategorySchema> {
    get documentName(): JournalEntryCategoryMetadata["name"];
}

interface JournalEntryCategoryMetadata extends DocumentClassMetadata {
    name: "JournalEntryCategory";
    collection: "categories";
    label: "DOCUMENT.JournalEntryCategory";
    labelPlural: "DOCUMENT.JournalEntryCategories";
    isEmbedded: true;
}

type JournalEntryCategorySchema = {
    /** The _id which uniquely identifies this JournalEntryCategory document */
    _id: fields.DocumentIdField;
    /** The name of this JournalEntryCategory */
    name: fields.StringField<string, string, true, false, true>;
    /** The numeric sort value which orders this JournalEntryCategory relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};
