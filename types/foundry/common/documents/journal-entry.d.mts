import { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseFolder, BaseJournalEntryPage } from "./_module.mjs";

/** The JournalEntry document model. */
export default class BaseJournalEntry extends Document<null, JournalEntrySchema> {
    static override get metadata(): JournalEntryMetadata;

    static override defineSchema(): JournalEntrySchema;
}

export default interface BaseJournalEntry
    extends Document<null, JournalEntrySchema>,
        fields.ModelPropsFromSchema<JournalEntrySchema> {
    readonly pages: EmbeddedCollection<BaseJournalEntryPage<this>>;

    get documentName(): JournalEntryMetadata["name"];
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
    pages: fields.EmbeddedCollectionField<BaseJournalEntryPage<BaseJournalEntry>>;
    /** The _id of a Folder which contains this JournalEntry */
    folder: fields.ForeignDocumentField<BaseFolder>;
    /** The numeric sort value which orders this JournalEntry relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this JournalEntry */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

export type JournalEntrySource = fields.SourceFromSchema<JournalEntrySchema>;
