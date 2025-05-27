import {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationRenderContext,
    ApplicationRenderOptions,
    FormFooterButton,
} from "@client/applications/_types.mjs";
import { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.mjs";
import FormDataExtended from "@client/applications/ux/form-data-extended.mjs";
import { Actor } from "@client/documents/_module.mjs";
import { PrototypeToken, PrototypeTokenSchema } from "@common/data/data.mjs";
import ApplicationV2 from "../../api/application.mjs";
import TokenApplicationMixin from "./mixin.mjs";

/**
 * @import {ApplicationClickAction, ApplicationFormSubmission} from "../../_types.mjs";
 * @import DocumentSheetV2 from "../../api/document-sheet.mjs";
 */

/**
 * The Application responsible for configuring an actor's PrototypeToken
 * @extends ApplicationV2
 * @mixes TokenApplication
 */
export default class PrototypeTokenConfig extends TokenApplicationMixin(ApplicationV2) {
    constructor(options?: DeepPartial<ApplicationConfiguration>);

    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    override isPrototype: true;

    override get title(): string;

    override get token(): PrototypeToken<Actor>;

    override get actor(): Actor | null;

    protected override get _fields(): PrototypeTokenSchema;

    /**
     * Is this sheet visible to the user?
     */
    get isVisible(): boolean;

    protected override _canRender(options: ApplicationRenderOptions): boolean;

    protected override _initializeApplicationOptions(
        options: DeepPartial<ApplicationConfiguration>,
    ): ApplicationConfiguration;

    protected override _initializeTokenPreview(): Promise<void>;

    protected override _configureRenderOptions(options: HandlebarsRenderOptions): void;

    protected override _prepareButtons(): FormFooterButton[];

    protected override _onFirstRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    /* -------------------------------------------- */
    /*  Form Submission                             */
    /* -------------------------------------------- */

    protected _processFormData(
        event: Event,
        form: HTMLFormElement,
        formData: FormDataExtended,
    ): Record<string, unknown>;

    protected override _tearDown(options: ApplicationClosingOptions): void;
}
