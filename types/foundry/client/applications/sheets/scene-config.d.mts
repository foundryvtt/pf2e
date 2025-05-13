import Scene from "@client/documents/scene.mjs";
import { ApplicationClosingOptions, ApplicationFormConfiguration, ApplicationTabsConfiguration } from "../_types.mjs";
import DocumentSheetV2, { DocumentSheetConfiguration, DocumentSheetRenderContext } from "../api/document-sheet.mjs";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../api/handlebars-application.mjs";
import FormDataExtended from "../ux/form-data-extended.mjs";

/**
 * The Application responsible for configuring a single Scene document.
 */
export default class SceneConfig<TDocument extends Scene> extends HandlebarsApplicationMixin(DocumentSheetV2) {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    static override TABS: Record<string, ApplicationTabsConfiguration>;

    protected override _prepareContext(options: HandlebarsRenderOptions): Promise<DocumentSheetRenderContext>;

    protected override _preparePartContext(
        partId: string,
        context: DocumentSheetRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<DocumentSheetRenderContext>;

    override changeTab(
        tab: string,
        group: string,
        options?: { event?: Event; navElement?: HTMLElement; force?: boolean; updatePosition?: boolean },
    ): void;

    protected _prepareSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        formData: FormDataExtended,
        updateData?: Record<string, unknown>,
    ): Record<string, unknown>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onRender(context: object, options: HandlebarsRenderOptions): Promise<void>;

    protected override _onChangeForm(formConfig: ApplicationFormConfiguration, event: Event): void;

    protected override _onClose(options: ApplicationClosingOptions): void;
}

export default interface SceneConfig<TDocument extends Scene> {
    options: DocumentSheetConfiguration<TDocument>;

    get document(): TDocument;
}
