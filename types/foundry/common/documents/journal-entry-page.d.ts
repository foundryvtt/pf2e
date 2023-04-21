import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BaseJournalEntry } from "./module.d.ts";

/** The JournalEntryPage document model. */
export default class BaseJournalEntryPage<TParent extends BaseJournalEntry | null> extends Document {
    static override get metadata(): JournalEntryPageMetadata;

    readonly type: string;
}

export default interface BaseJournalEntryPage<TParent extends BaseJournalEntry | null> extends Document {
    readonly _source: JournalEntryPageSource;
    readonly parent: TParent;

    get documentName(): (typeof BaseJournalEntryPage)["metadata"]["name"];
}

/**
 * The data schema for a JournalEntryPage document.
 * @property _id
 * @property name         The text name of this page.
 * @property type         The type of this page, in {@link BaseJournalEntryPage.TYPES}.
 * @property title  Data that control's the display of this page's title.
 * @property image  Data particular to image journal entry pages.
 * @property text    Data particular to text journal entry pages.
 * @property video  Data particular to video journal entry pages.
 * @property [src]        The URI of the image or other external media to be used for this page.
 * @property system       System-specific data.
 * @property sort         The numeric sort value which orders this page relative to its siblings.
 * @property [ownership]  An object which configures the ownership of this page.
 * @property [flags]      An object of optional key/value flags.
 */
export interface JournalEntryPageSource {
    _id: string;
    name: string;
    title: JournalEntryPageTitleData;
    image: JournalEntryPageImageData;
    text: JournalEntryPageTextData;
    video: JournalEntryPageVideoData;
    src?: string | null;
    system: object; // will be filled out later
    sort: number;
    ownership?: Record<string, DocumentOwnershipLevel>;
    flags: object; // will be filled out later
}

interface JournalEntryPageImageData {
    /** A caption for the image. */
    caption?: string;
}

interface JournalEntryPageTextData {
    /** The content of the JournalEntryPage in a format appropriate for its type. */
    content?: string;
    /** The original markdown source, if applicable. */
    markdown?: string;
    /** The format of the page's content, in {@link CONST.JOURNAL_ENTRY_PAGE_FORMATS}. */
    format: JournalEntryPageFormat;
}

interface JournalEntryPageVideoData {
    /** Automatically loop the video? */
    loop?: boolean;
    /** Should the video play automatically? */
    autoplay?: boolean;
    /** The volume level of any audio that the video file contains. */
    volume?: number;
    /** The starting point of the video, in seconds. */
    timestamp?: number;
    /** The width of the video, otherwise it will fill the available container width. */
    width?: number;
    /**
     * The height of the video, otherwise it will use the aspect ratio of the source video,
     * or 16:9 if that aspect ratio is not available.
     */
    height?: number;
}

interface JournalEntryPageTitleData {
    /** Whether to render the page's title in the overall journal view. */
    show: boolean;
    /** The heading level to render this page's title at in the overall journal view. */
    level: number;
}

interface JournalEntryPageMetadata extends DocumentMetadata {
    name: "JournalEntryPage";
    collection: "pages";
    indexed: true;
    label: "DOCUMENT.JournalEntryPage";
    labelPlural: "DOCUMENT.JournalEntryPages";
    coreTypes: ["image", "pdf", "text", "video"];
}
