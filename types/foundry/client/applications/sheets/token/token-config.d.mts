import FormDataExtended from "@client/applications/ux/form-data-extended.mjs";
import { Actor, Scene, TokenDocument } from "@client/documents/_module.mjs";
import { DatabaseCreateOperation, DatabaseUpdateOperation } from "@common/abstract/_types.mjs";
import { TokenSchema } from "@common/documents/token.mjs";
import { ApplicationClosingOptions, ApplicationFormConfiguration, ApplicationRenderContext } from "../../_types.mjs";
import DocumentSheetV2, { DocumentSheetRenderContext } from "../../api/document-sheet.mjs";
import { HandlebarsRenderOptions } from "../../api/handlebars-application.mts";
import TokenApplicationMixin from "./mixin.mts";

/**
 * The Application responsible for configuring a single token document within a parent Scene
 */
export default class TokenConfig extends TokenApplicationMixin(DocumentSheetV2) {
    override isPrototype: boolean;

    override get token(): TokenDocument;

    override get actor(): Actor | null;

    protected override get _fields(): TokenSchema;

    override get isVisible(): boolean;

    protected override _initializeTokenPreview(): Promise<void>;

    protected override _prepareContext(options: HandlebarsRenderOptions): Promise<DocumentSheetRenderContext>;

    protected override _prepareAppearanceTab(): Promise<ApplicationRenderContext>;

    protected override _toggleDisabled(disabled: boolean): void;

    protected override _previewChanges(changes: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    protected override _onChangeForm(formConfig: ApplicationFormConfiguration, event: Event): void;

    /**
     * Handle changing the attribute bar in the drop-down selector to update the default current and max value
     * @param event The select input change event
     */
    protected _onChangeBar(event: Event): void;

    protected override _onClose(options: ApplicationClosingOptions): void;

    /* -------------------------------------------- */
    /*  Form Submission                             */
    /* -------------------------------------------- */

    protected override _processFormData(
        event: SubmitEvent | null,
        form: HTMLFormElement,
        formData: FormDataExtended,
    ): Record<string, unknown>;

    protected override _processSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        submitData: Record<string, unknown>,
        options?: Partial<DatabaseCreateOperation<Scene | null>> | Partial<DatabaseUpdateOperation<Scene | null>>,
    ): Promise<void>;
}
