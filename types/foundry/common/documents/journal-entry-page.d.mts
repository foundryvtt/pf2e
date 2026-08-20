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
    /** The _id which uniquely identifies this JournalEntryPage embedded document.t */
    _id: fields.DocumentIdField;
    /** The text name of this page. */
    name: fields.StringField<string, string, true, false, false>;
    /** The type of this page. */
    type: fields.DocumentTypeField<TType, TType, true, false, true, BaseJournalEntryPage>;
    /** System-specific data. */
    system: fields.TypeDataField<TSystemSource, TSystemData>;
    /** Data that control's the display of this page's title. */
    title: fields.SchemaField<{
        /** Whether to render the page's title in the overall journal view. */
        show: fields.BooleanField;
        /** The heading level to render this page's title at in the overall journal view. */
        level: fields.NumberField<number, number, true, false, true>;
    }>;
    /** Data particular to image journal entry pages. */
    image: fields.SchemaField<{
        /** A caption for the image. */
        caption: fields.StringField<string, string, false, false, false>;
    }>;
    /** Data particular to text journal entry pages. */
    text: fields.SchemaField<{
        /** The content of the JournalEntryPage in a format appropriate for its type. */
        content: fields.HTMLField<string, string, false, false, false>;
        /** The original markdown source, if applicable. */
        markdown: fields.StringField<string, string, false, false, false>;
        /** The format of the page's content, in CONST.JOURNAL_ENTRY_PAGE_FORMATS. */
        format: fields.NumberField<JournalEntryPageFormat>;
    }>;
    /** Data particular to video journal entry pages. */
    video: fields.SchemaField<{
        /** Show player controls for this video? */
        controls: fields.BooleanField;
        /** Automatically loop the video? */
        loop: fields.BooleanField<boolean, boolean, false, false, false>;
        /** Should the video play automatically? */
        autoplay: fields.BooleanField<boolean, boolean, false, false, false>;
        /** The volume level of any audio that the video file contains. */
        volume: fields.AlphaField<true, false, true>;
        /** The starting point of the video, in seconds. */
        timestamp: fields.NumberField<number, number, false, false, false>;
        /** The width of the video, otherwise it will fill the available container width. */
        width: fields.NumberField<number, number, true, false, false>;
        /** The height of the video, otherwise it will use the aspect ratio of the source video, or 16:9 if that aspect ratio is not available. */
        height: fields.NumberField<number, number, false, false, false>;
    }>;
    /** The URI of the image or other external media to be used for this page. */
    src: fields.StringField<string, string, false, true, true>;
    /** An optional category that this page belongs to. */
    category: fields.DocumentIdField;
    /** The numeric sort value which orders this page relative to its siblings. */
    sort: fields.IntegerSortField;
    /** An object which configures the ownership of this page. */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

export type JournalEntryPageSource = fields.SourceFromSchema<JournalEntryPageSchema>;

export type CorePageType = JournalEntryPageMetadata["coreTypes"][number];
