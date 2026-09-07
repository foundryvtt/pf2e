import JournalEntryPage, { JournalEntryPageHeading } from "@client/documents/journal-entry-page.mjs";
import DocumentSheetV2, {
    DocumentSheetConfiguration,
    DocumentSheetRenderContext,
    DocumentSheetRenderOptions,
} from "../../api/document-sheet.mjs";

export interface JournalPageSheetConfiguration extends DocumentSheetConfiguration {
    document: JournalEntryPage;
    /** Whether the sheet includes additional table of contents elements besides its title. */
    includeTOC?: boolean;
    /** Whether the sheet is in edit or view mode. */
    mode?: "edit" | "view";
    /** Classes appended to the page's root element when embedded in another sheet in view mode */
    viewClasses?: string;
}

/**
 * An abstract Application responsible for displaying and editing a single JournalEntryPage Document.
 */
export default abstract class JournalEntryPageSheet<
    TConfig extends JournalPageSheetConfiguration = JournalPageSheetConfiguration,
    TRenderOptions extends DocumentSheetRenderOptions = DocumentSheetRenderOptions,
> extends DocumentSheetV2<TConfig, TRenderOptions> {
    static override DEFAULT_OPTIONS: DeepPartial<JournalPageSheetConfiguration>;

    static override emittedEvents: readonly string[];

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The table of contents for this text page.
     */
    toc: Record<string, JournalEntryPageHeading>;

    /**
     * Indicates that the sheet renders with App V2 rather than V1.
     */
    static readonly isV2: boolean;

    /**
     * Indicates that the sheet renders with App V2 rather than V1.
     */
    readonly isV2: boolean;

    /**
     * Whether the sheet is in view mode.
     */
    get isView(): boolean;

    /**
     * The JournalEntryPage for this sheet.
     */
    get page(): JournalEntryPage;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected _insertElement(element: HTMLElement, options?: TRenderOptions): Promise<void>;

    protected override _prepareContext(options: TRenderOptions): Promise<DocumentSheetRenderContext>;

    /**
     * Prepare heading level choices.
     */
    protected _prepareHeadingLevels(): Record<string, string>;

    /* -------------------------------------------- */
    /*  Events                                      */
    /* -------------------------------------------- */

    /**
     * Actions performed when this sheet is closed in some parent view.
     */
    protected _onCloseView(): void;

    protected override _onRender(
        context: DocumentSheetRenderContext,
        options: DocumentSheetRenderOptions,
    ): Promise<void>;
}
