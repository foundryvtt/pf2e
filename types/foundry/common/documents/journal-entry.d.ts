import type { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/module.d.ts";
import type * as fields from "../data/fields.d.ts";
import type * as documents from "./module.d.ts";
import type { BaseJournalEntryPage } from "./module.d.ts";

/** The JournalEntry document model. */
export default class BaseJournalEntry extends Document<null, JournalEntrySchema> {
    static override get metadata(): JournalEntryMetadata;

    static override defineSchema(): JournalEntrySchema;

    readonly pages: EmbeddedCollection<BaseJournalEntryPage<this>>;
}

export default interface BaseJournalEntry
    extends Document<null, JournalEntrySchema>,
        ModelPropsFromSchema<JournalEntrySchema> {
    readonly _source: JournalEntrySource;

    get documentName(): (typeof BaseJournalEntry)["metadata"]["name"];

    foo: this["_source"]["pages"];
}

interface JournalEntryMetadata extends DocumentMetadata {
    name: "JournalEntry";
    collection: "journal";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "sort"];
    embedded: {
        JournalEntryPage: "pages";
    };
    label: "DOCUMENT.JournalEntry";
    labelPlural: "DOCUMENT.JournalEntries";
    isPrimary: true;
    permissions: Omit<DocumentMetadata["permissions"], "create"> & {
        create: "JOURNAL_CREATE";
    };
}

type JournalEntrySchema = {
    /** The _id which uniquely identifies this JournalEntry document */
    _id: fields.DocumentIdField;
    /** The name of this JournalEntry */
    name: fields.StringField<string, string, true, false, false>;
    /** The pages contained within this JournalEntry document */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pages: fields.EmbeddedCollectionField<documents.BaseJournalEntryPage<any>>;
    /** The _id of a Folder which contains this JournalEntry */
    folder: fields.ForeignDocumentField<documents.BaseFolder>;
    /** The numeric sort value which orders this JournalEntry relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this JournalEntry */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

type JournalEntrySource = SourceFromSchema<JournalEntrySchema>;
