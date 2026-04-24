import { JournalEntryPageFormat } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseJournalEntry } from "./_module.mjs";

/**
 * The JournalEntryPage Document.
 * Defines the DataSchema and common behaviors for a JournalEntryPage which are shared between both client and server.
 * @category Documents
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
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    type: fields.DocumentTypeField<TType, TType, true, false, true, BaseJournalEntryPage>;
    system: fields.TypeDataField<TSystemSource, TSystemData>;
    title: fields.SchemaField<{
        show: fields.BooleanField;
        level: fields.NumberField<number, number, true, false, true>;
    }>;
    image: fields.SchemaField<{
        caption: fields.StringField<string, string, false, false, false>;
    }>;
    text: fields.SchemaField<{
        content: fields.HTMLField<string, string, false, false, false>;
        markdown: fields.StringField<string, string, false, false, false>;
        format: fields.NumberField<JournalEntryPageFormat>;
    }>;
    video: fields.SchemaField<{
        controls: fields.BooleanField;
        loop: fields.BooleanField<boolean, boolean, false, false, false>;
        autoplay: fields.BooleanField<boolean, boolean, false, false, false>;
        volume: fields.AlphaField<true, false, true>;
        timestamp: fields.NumberField<number, number, false, false, false>;
        width: fields.NumberField<number, number, true, false, false>;
        height: fields.NumberField<number, number, false, false, false>;
    }>;
    src: fields.StringField<string, string, false, true, true>;
    category: fields.DocumentIdField;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type JournalEntryPageSource = fields.SourceFromSchema<JournalEntryPageSchema>;

export type CorePageType = JournalEntryPageMetadata["coreTypes"][number];
