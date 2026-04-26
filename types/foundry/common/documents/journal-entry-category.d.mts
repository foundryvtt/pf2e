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
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, true>;
    sort: fields.IntegerSortField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};
