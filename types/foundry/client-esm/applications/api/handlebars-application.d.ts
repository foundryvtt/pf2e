import DocumentSheetV2 from "./document-sheet.js";

/** Augment an Application class with [Handlebars](https://handlebarsjs.com) template rendering behavior. */
declare function HandlebarsApplicationMixin<
    TDocument extends foundry.abstract.Document,
    TConfig extends DocumentSheetConfiguration = DocumentSheetConfiguration,
    TRenderOptions extends DocumentSheetRenderOptions = DocumentSheetRenderOptions,
>(
    app: DocumentSheetV2<TDocument, TConfig, TRenderOptions>,
): ConstructorOf<HandlebarsApplicationDocumentSheet<TDocument, TConfig, TRenderOptions>>;

export default HandlebarsApplicationMixin;

export class HandlebarsApplicationDocumentSheet<
    TDocument extends foundry.abstract.Document,
    TConfig extends DocumentSheetConfiguration = DocumentSheetConfiguration,
    TRenderOptions extends DocumentSheetRenderOptions = DocumentSheetRenderOptions,
> extends DocumentSheetV2<TDocument, TConfig, TRenderOptions> {
    static PARTS: Record<string, unknown>;

    /**
     * A record of all rendered template parts.
     * @returns {Record<string, HTMLElement>}
     */
    get parts(): Record<string, HTMLElement>;

    /**
     * Render each configured application part using Handlebars templates.
     * @param context        Context data for the render operation
     * @param options        Options which configure application rendering behavior
     * @returns A single rendered HTMLElement for each requested part
     */
    protected override _renderHTML(
        context: ApplicationRenderContext,
        options: TRenderOptions & HandlebarsRenderOptions,
    ): Promise<Record<string, HTMLElement>>;

    /**
     * Prepare context that is specific to only a single rendered part.
     *
     * It is recommended to augment or mutate the shared context so that downstream methods like _onRender have
     * visibility into the data that was used for rendering. It is acceptable to return a different context object
     * rather than mutating the shared context at the expense of this transparency.
     *
     * @param partId       The part being rendered
     * @param context      Shared context provided by _prepareContext
     * @returns Context data for a specific part
     */
    protected _preparePartContext(partId: string, context: ApplicationRenderContext): Promise<ApplicationRenderContext>;

    /**
     * Replace the HTML of the application with the result provided by Handlebars rendering.
     * @param result  The result from Handlebars template rendering
     * @param content The content element into which the rendered result must be inserted
     * @param options     Options which configure application rendering behavior
     */
    protected override _replaceHTML(
        result: Record<string, HTMLElement>,
        content: HTMLElement,
        options: TRenderOptions & HandlebarsRenderOptions,
    ): void;

    /**
     * Prepare data used to synchronize the state of a template part.
     * @param partId                  The id of the part being rendered
     * @param newElement              The new rendered HTML element for the part
     * @param priorElement            The prior rendered HTML element for the part
     * @param state                   A state object which is used to synchronize after replacement
     */
    protected _preSyncPartState(
        partId: string,
        newElement: HTMLElement,
        priorElement: HTMLElement,
        state: object,
    ): void;

    /**
     * Synchronize the state of a template part after it has been rendered and replaced in the DOM.
     * @param partId                  The id of the part being rendered
     * @param newElement              The new rendered HTML element for the part
     * @param priorElement            The prior rendered HTML element for the part
     * @param state                   A state object which is used to synchronize after replacement
     * @protected
     */
    protected _syncPartState(partId: string, newElement: HTMLElement, priorElement: HTMLElement, state: object): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Attach event listeners to rendered template parts.
     * @param partId       The id of the part being rendered
     * @param htmlElement  The rendered HTML element for the part
     * @param options       Rendering options passed to the render method
     */
    protected _attachPartListeners(
        partId: string,
        htmlElement: HTMLElement,
        options: TRenderOptions & HandlebarsRenderOptions,
    ): void;
}

declare global {
    interface HandlebarsTemplatePart {
        /** The template entry-point for the part */
        template: string;

        /**
         * A CSS id to assign to the top-level element of the rendered part.
         * This id string is automatically prefixed by the application id.
         */
        id?: string;

        /** An array of CSS classes to apply to the top-level element of the rendered part. */
        classes?: string[];

        /**
         * An array of templates that are required to render the part.
         * If omitted, only the entry-point is inferred as required.
         */
        templates?: string[];

        /**
         * An array of selectors within this part whose scroll positions should
         * be persisted during a re-render operation. A blank string is used
         * to denote that the root level of the part is scrollable.
         */
        scrollable?: boolean[];

        /** A registry of forms selectors and submission handlers. */
        forms?: Record<string, ApplicationFormConfiguration>;
    }

    interface HandlebarsRenderOptions {
        /** An array of named template parts to render */
        parts: string[];
    }
}
