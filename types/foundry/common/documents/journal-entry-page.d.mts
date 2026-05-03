import { JournalEntryPageFormat } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseJournalEntry } from "./_module.mjs";

/**
 * The JournalEntryPage Document.
 * Defines the DataSchema and common behaviors for a JournalEntryPage which are shared between both client and server.
 */
export default class BaseJournalEntryPage<
    TParent extends BaseJournalEntry | null = BaseJournalEntry | null,
> extends Document<TParent, JournalEntryPageSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): JournalEntryPageMetadata;

    static override defineSchema(): JournalEntryPageSchema;

    static override LOCALIZATION_PREFIXES: string[];
}

export default interface BaseJournalEntryPage<TParent extends BaseJournalEntry | null = BaseJournalEntry | null>
    extends Document<TParent, JournalEntryPageSchema>, fields.ModelPropsFromSchema<JournalEntryPageSchema> {
    get documentName(): JournalEntryPageMetadata["name"];
}

interface JournalEntryPageMetadata extends DocumentClassMetadata {
    name: "JournalEntryPage";
    collection: "pages";
    hasTypeData: true;
    indexed: true;
    label: "DOCUMENT.JournalEntryPage";
    labelPlural: "DOCUMENT.JournalEntryPages";
    coreTypes: ["text", "image", "pdf", "video"];
    compendiumIndexFields: ["name", "type", "sort"];
}

type JournalEntryPageSchema<
    TType extends string = string,
    TSystemSource extends object = object,
    TSystemData extends object = TSystemSource,
> = {
    /** The _id which uniquely identifies this JournalEntryPage document */
    _id: fields.DocumentIdField;
    /** The name of this JournalEntryPage */
    name: fields.StringField<string, string, true, false, false>;
    /** An JournalEntryPage subtype which configures the system data model applied */
    type: fields.DocumentTypeField<TType, TType, true, false, true, BaseJournalEntryPage>;
    /** They system data object which is defined by the system data model */
    system: fields.TypeDataField<TSystemSource, TSystemData>;
    /** Data the controls the display of this page's title */
    title: fields.SchemaField<{
        show: fields.BooleanField;
        level: fields.NumberField<number, number, true, false, true>;
    }>;
    /** Data particular to image journal entry pages */
    image: fields.SchemaField<{
        caption: fields.StringField<string, string, false, false, false>;
    }>;
    /** Data particular to text journal entry pages */
    text: fields.SchemaField<{
        content: fields.HTMLField<string, string, false, false, false>;
        markdown: fields.StringField<string, string, false, false, false>;
        format: fields.NumberField<JournalEntryPageFormat>;
    }>;
    /** Data particular to video journal entry pages */
    video: fields.SchemaField<{
        controls: fields.BooleanField;
        loop: fields.BooleanField<boolean, boolean, false, false, false>;
        autoplay: fields.BooleanField<boolean, boolean, false, false, false>;
        volume: fields.AlphaField<true, false, true>;
        timestamp: fields.NumberField<number, number, false, false, false>;
        width: fields.NumberField<number, number, true, false, false>;
        height: fields.NumberField<number, number, false, false, false>;
    }>;
    /** The URI of the image or other external media to be used for this page. */
    src: fields.StringField<string, string, false, true, true>;
    /** The _id of the JournalEntryCategory applied to this page */
    category: fields.DocumentIdField;
    /** The numeric sort value which orders this JournalEntryPage relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this JournalEntryPage */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

export type JournalEntryPageSource = fields.SourceFromSchema<JournalEntryPageSchema>;

export type CorePageType = JournalEntryPageMetadata["coreTypes"][number];
