import User from "@client/documents/user.mjs";
import { DatabaseCreateOperation, DatabaseUpdateOperation, DataSchema } from "@common/abstract/_types.mjs";
import Document from "@common/abstract/document.mjs";
import {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationFormConfiguration,
    ApplicationHeaderControlsEntry,
    ApplicationRenderContext,
    ApplicationRenderOptions,
} from "../_types.mjs";
import FormDataExtended from "../ux/form-data-extended.mjs";
import ApplicationV2 from "./application.mjs";

export interface DocumentSheetRenderContext extends ApplicationRenderContext {
    document: Document;
    source: Record<string, JSONValue | undefined>;
    fields: DataSchema;
    editable: boolean;
    user: User;
    rootId: string;
}

export default abstract class DocumentSheetV2<
    TConfig extends DocumentSheetConfiguration = DocumentSheetConfiguration,
    TRenderOptions extends DocumentSheetRenderOptions = DocumentSheetRenderOptions,
> extends ApplicationV2<TConfig, TRenderOptions> {
    constructor(options?: DeepPartial<TConfig>);

    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    get document(): TConfig["document"];

    override get title(): string;

    /**
     * Is this Document sheet visible to the current User?
     * This is governed by the viewPermission threshold configured for the class.
     */
    get isVisible(): boolean;

    /**
     * Is this Document sheet editable by the current User?
     * This is governed by the editPermission threshold configured for the class.
     */
    get isEditable(): boolean;

    protected override _initializeApplicationOptions(options: DeepPartial<TConfig>): TConfig;

    protected override _headerControlButtons(): Generator<ApplicationHeaderControlsEntry>;

    protected override _configureRenderOptions(options: DeepPartial<TRenderOptions>): TRenderOptions;

    protected override _prepareContext(options: TRenderOptions): Promise<DocumentSheetRenderContext>;

    protected override _renderFrame(options: TRenderOptions): Promise<HTMLElement>;

    /**
     * Disable or reenable all form fields in this application.
     * @param disabled Should the fields be disabled?
     */
    protected _toggleDisabled(disabled: boolean): void;

    /* -------------------------------------------- */
    /*  Application Life-Cycle Events               */
    /* -------------------------------------------- */

    protected override _canRender(): void;

    protected override _onFirstRender(context: object, options: TRenderOptions): Promise<void>;

    protected override _onRender(context: object, options: TRenderOptions): Promise<void>;

    protected override _onClose(options: ApplicationClosingOptions): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /* -------------------------------------------- */
    /*  Form Submission                             */
    /* -------------------------------------------- */

    protected override _onChangeForm(formConfig: ApplicationFormConfiguration, event: Event): void;

    /**
     * Handle toggling the revealed state of a secret embedded in some content.
     * @param event The triggering event.
     */
    protected _onRevealSecret(event: Event): void;

    /**
     * Prepare data used to update the Item upon form submission.
     * This data is cleaned and validated before being returned for further processing.
     * @param event      The originating form submission event
     * @param form       The form element that was submitted
     * @param formData   Processed data for the submitted form
     * @param updateData Additional data passed in if this form is submitted manually which should be merged with
     *                   prepared formData.
     * @throws {Error} Subclasses may throw validation errors here to prevent form submission
     * @returns Prepared submission data as an object
     */
    protected _prepareSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        formData: FormDataExtended,
        updateData?: object,
    ): object;

    /**
     * Customize how form data is extracted into an expanded object.
     * @param event    The originating form submission event
     * @param form     The form element that was submitted
     * @param formData Processed data for the submitted form
     * @returns An expanded object of processed form data
     * @throws {Error} Subclasses may throw validation errors here to prevent form submission
     */
    protected _processFormData(
        event: SubmitEvent | null,
        form: HTMLFormElement,
        formData: FormDataExtended,
    ): Record<string, unknown>;

    /**
     * Submit a document update or creation request based on the processed form data.
     * @param event      The originating form submission event
     * @param form       The form element that was submitted
     * @param submitData Processed and validated form data to be used for a document update
     * @param options Additional options altering the request
     */
    protected _processSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        submitData: Record<string, unknown>,
        options?:
            | Partial<DatabaseCreateOperation<TConfig["document"]["parent"]>>
            | Partial<DatabaseUpdateOperation<TConfig["document"]["parent"]>>,
    ): Promise<void>;
}

export interface DocumentSheetConfiguration<TDocument extends Document = Document> extends ApplicationConfiguration {
    /** The Document instance associated with this sheet */
    document: TDocument;
    /** A permission level in CONST.DOCUMENT_OWNERSHIP_LEVELS */
    viewPermission: number;
    /** A permission level in CONST.DOCUMENT_OWNERSHIP_LEVELS */
    editPermission: number;
    /** Can this sheet class be used to create a new Document? */
    canCreate: boolean;
    /** Allow sheet configuration as a header button */
    sheetConfig: boolean;
}

export interface DocumentSheetRenderOptions extends ApplicationRenderOptions {
    /** A string with the format "{operation}{documentName}" providing context */
    renderContext?: string;
    /** Data describing the document modification that occurred */
    renderData?: object;
}
