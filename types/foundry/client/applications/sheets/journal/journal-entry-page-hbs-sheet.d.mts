import { DocumentSheetRenderContext, DocumentSheetRenderOptions } from "@client/applications/api/document-sheet.mjs";
import { FormDataExtended } from "@client/applications/ux/_module.mjs";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../../api/handlebars-application.mjs";
import JournalEntryPageSheet, { JournalPageSheetConfiguration } from "./journal-entry-page-sheet.mjs";

export interface JournalEntryPageHandlebarsSheetRenderOptions
    extends DocumentSheetRenderOptions, HandlebarsRenderOptions {}

/**
 * An abstract subclass that contains specialised handlebars logic for JournalEntryPageSheets.
 */
export default class JournalEntryPageHandlebarsSheet extends HandlebarsApplicationMixin(
    JournalEntryPageSheet<JournalPageSheetConfiguration, JournalEntryPageHandlebarsSheetRenderOptions>,
) {
    /**
     * Handlebars parts to render in edit mode.
     */
    static EDIT_PARTS: Record<string, HandlebarsTemplatePart>;

    /**
     * Handlebars part to render in view mode.
     */
    static VIEW_PARTS: Record<string, HandlebarsTemplatePart>;

    protected override _configureRenderParts(options: HandlebarsRenderOptions): Record<string, HandlebarsTemplatePart>;

    /**
     * Prepare render context for the content part.
     */
    protected _prepareContentContext(
        context: DocumentSheetRenderContext,
        options: JournalEntryPageHandlebarsSheetRenderOptions,
    ): Promise<void>;

    protected override _preparePartContext(
        partId: string,
        context: DocumentSheetRenderContext,
        options: JournalEntryPageHandlebarsSheetRenderOptions,
    ): Promise<DocumentSheetRenderContext>;

    /**
     * Prepare render context for the footer part.
     */
    protected _prepareFooterContext(
        context: DocumentSheetRenderContext,
        options: JournalEntryPageHandlebarsSheetRenderOptions,
    ): Promise<void>;

    /**
     * Prepare render context for the header part.
     */
    protected _prepareHeaderContext(
        context: DocumentSheetRenderContext,
        options: JournalEntryPageHandlebarsSheetRenderOptions,
    ): Promise<void>;

    protected override _prepareSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        formData: FormDataExtended,
        updateData?: object,
    ): object;
}
