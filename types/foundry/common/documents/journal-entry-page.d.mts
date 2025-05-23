import { DocumentOwnershipLevel, JournalEntryPageFormat } from "@common/constants.mjs";
import { Document, DocumentMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseJournalEntry, BaseUser } from "./_module.mjs";

/** The JournalEntryPage document model. */
export default class BaseJournalEntryPage<TParent extends BaseJournalEntry | null> extends Document<
    TParent,
    JournalEntryPageSchema
> {
    static override get metadata(): JournalEntryPageMetadata;

    static override defineSchema(): JournalEntryPageSchema;

    override getUserLevel(user: BaseUser): DocumentOwnershipLevel;
}

export default interface BaseJournalEntryPage<TParent extends BaseJournalEntry | null>
    extends Document<TParent, JournalEntryPageSchema>,
        fields.ModelPropsFromSchema<JournalEntryPageSchema> {
    get documentName(): JournalEntryPageMetadata["name"];
}

interface JournalEntryPageMetadata extends DocumentMetadata {
    name: "JournalEntryPage";
    collection: "pages";
    indexed: true;
    label: "DOCUMENT.JournalEntryPage";
    labelPlural: "DOCUMENT.JournalEntryPages";
    coreTypes: ["image", "pdf", "text", "video"];
}

type JournalEntryPageSchema<
    TType extends string = string,
    TSystemSource extends object = object,
    TSystemData extends object = TSystemSource,
> = {
    _id: fields.DocumentIdField;
    /** The text name of this page. */
    name: fields.StringField<string, string, true, false, false>;
    /** The type of this page, in {@link BaseJournalEntryPage.TYPES}. */
    type: fields.StringField<TType, TType, true, false, true>;
    /** Data that control's the display of this page's title. */
    title: fields.SchemaField<{
        show: fields.BooleanField;
        level: fields.NumberField<number, number, true, false, true>;
    }>;
    /** Data particular to image journal entry pages. */
    image: fields.SchemaField<{
        caption: fields.StringField<string, string, false, false, false>;
    }>;
    /** Data particular to text journal entry pages. */
    text: fields.SchemaField<{
        content: fields.HTMLField<string, string, false, false, false>;
        markdown: fields.StringField<string, string, false, false, false>;
        format: fields.NumberField<JournalEntryPageFormat>;
    }>;
    /** Data particular to video journal entry pages. */
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
    /** System-specific data. */
    system: fields.TypeDataField<TSystemSource, TSystemData>;
    /** The numeric sort value which orders this page relative to its siblings. */
    sort: fields.IntegerSortField;
    /** An object which configures the ownership of this page. */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags. */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

export type JournalEntryPageSource = fields.SourceFromSchema<JournalEntryPageSchema>;

export type CorePageType = "image" | "pdf" | "text" | "video";
