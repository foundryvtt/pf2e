import type Document from "../../../common/abstract/document.d.ts";
import type { ApplicationConfiguration, ApplicationRenderOptions } from "../_types.d.ts";
import type ApplicationV2 from "./application.d.ts";

export default abstract class DocumentSheetV2<
    TConfig extends DocumentSheetConfiguration = DocumentSheetConfiguration,
    TRenderOptions extends DocumentSheetRenderOptions = DocumentSheetRenderOptions,
> extends ApplicationV2<TConfig, TRenderOptions> {
    constructor(options?: DeepPartial<TConfig>);

    get document(): this["options"]["document"];

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

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Prepare data used to update the Item upon form submission.
     * @param event              The originating form submission event
     * @param form               The form element that was submitted
     * @param formData           Processed data for the submitted form
     * @returns Prepared submission data as an object
     */
    protected _prepareSubmitData(event: SubmitEvent, form: HTMLFormElement, formData: FormDataExtended): object;
}

export interface DocumentSheetConfiguration<TDocument extends Document = Document> extends ApplicationConfiguration {
    /** The Document instance associated with this sheet */
    document: TDocument;
    /** A permission level in CONST.DOCUMENT_OWNERSHIP_LEVELS */
    viewPermission: number;
    /** A permission level in CONST.DOCUMENT_OWNERSHIP_LEVELS */
    editPermission: number;
    /** Allow sheet configuration as a header button */
    sheetConfig: boolean;
}

export interface DocumentSheetRenderOptions extends ApplicationRenderOptions {
    /** A string with the format "{operation}{documentName}" providing context */
    renderContext?: string;
    /** Data describing the document modification that occurred */
    renderData?: object;
}
