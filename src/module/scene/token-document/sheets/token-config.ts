import { ActorPF2e } from "@actor";
import type { ApplicationRenderContext } from "@client/applications/_types.d.mts";
import type { DocumentSheetConfiguration } from "@client/applications/api/document-sheet.d.mts";
import type { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.d.mts";
import type FormDataExtended from "@client/applications/ux/form-data-extended.d.mts";
import type { DatabaseCreateOperation, DatabaseUpdateOperation } from "@common/abstract/_types.d.mts";
import type { TokenDocumentPF2e } from "../index.ts";
import { type TokenConfigContext, TokenConfigHelper } from "./helper.ts";

class TokenConfigPF2e extends fa.sheets.TokenConfig {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration> = {
        sheetConfig: false,
        actions: {
            openAutomationSettings: TokenConfigPF2e.#onClickOpenAutomationSettings,
            toggleAutoscale: TokenConfigPF2e.#onClickToggleAutoscale,
            toggleSizeLink: TokenConfigPF2e.#onClickToggleSizeLink,
        },
    };

    static override PARTS = (() => {
        const parts = { ...super.PARTS };
        parts["appearance"].template = "systems/pf2e/templates/scene/token/appearance.hbs";
        return parts;
    })();

    #helper: TokenConfigHelper;

    constructor(options: DeepPartial<DocumentSheetConfiguration>) {
        super(options);
        this.#helper = new TokenConfigHelper(this);
    }

    protected override async _prepareContext(options: HandlebarsRenderOptions): Promise<TokenConfigContext> {
        const context = await super._prepareContext(options);
        return this.#helper.prepareContext(context);
    }

    /** Hide token-sight settings when rules-based vision is enabled */
    protected override async _onRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void> {
        await super._onRender(context, options);
        this.#helper.onRender(options);
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    static async #onClickOpenAutomationSettings(this: TokenConfigPF2e): Promise<void> {
        return this.#helper.handleClick("openAutomationSettings");
    }

    /** Disable the range input for token scale and style to indicate as much */
    static async #onClickToggleAutoscale(this: TokenConfigPF2e): Promise<void> {
        return this.#helper.handleClick("toggleAutoscale");
    }

    static async #onClickToggleSizeLink(this: TokenConfigPF2e): Promise<void> {
        return this.#helper.handleClick("toggleSizeLink");
    }

    /* -------------------------------------------- */
    /*  Form Submission                             */
    /* -------------------------------------------- */

    protected override _processFormData(
        event: SubmitEvent | null,
        form: HTMLFormElement,
        formData: FormDataExtended,
    ): Record<string, unknown> {
        const data = super._processFormData(event, form, formData);
        return this.#helper.processFormData(data, form);
    }

    protected override async _processSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        submitData: Record<string, unknown>,
        options?: Partial<DatabaseCreateOperation<Scene | null>> | Partial<DatabaseUpdateOperation<Scene | null>>,
    ): Promise<void> {
        this.#helper.processSubmitData(submitData);
        return super._processSubmitData(event, form, submitData, options);
    }
}

interface TokenConfigPF2e extends fa.sheets.TokenConfig {
    get token(): TokenDocumentPF2e;
    get actor(): ActorPF2e | null;
}

export { TokenConfigPF2e };
