import {
    ApplicationConfiguration,
    ApplicationFormConfiguration,
    ApplicationRenderContext,
    ApplicationTabsConfiguration,
    FormFooterButton,
} from "@client/applications/_types.mjs";
import ApplicationV2 from "@client/applications/api/application.mjs";
import Actor from "@client/documents/actor.mjs";
import TokenDocument from "@client/documents/token.mjs";
import { DataSchema } from "@common/abstract/_types.mjs";
import { PrototypeToken } from "@common/data/_module.mjs";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../../api/handlebars-application.mjs";

/**
 * A mixin for UI shared between TokenDocument and PrototypeToken sheets
 */
export default function TokenApplicationMixin<
    TBase extends AbstractConstructorOf<ApplicationV2> & {
        DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;
        TABS: Record<string, ApplicationTabsConfiguration>;
    },
>(Base: TBase) {
    abstract class TokenApplication extends HandlebarsApplicationMixin(Base) {
        static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {};

        static override PARTS: Record<string, HandlebarsTemplatePart> = {};

        static override TABS: Record<string, ApplicationTabsConfiguration> = {};

        /**
         * Localized Token Display Modes
         */
        static get DISPLAY_MODES(): Record<string, string> {
            return {};
        }

        /**
         * Localized Token Dispositions
         */
        static get TOKEN_DISPOSITIONS(): Record<string, string> {
            return {};
        }

        /**
         * Localized Token Turn Marker modes
         */
        static get TURN_MARKER_MODES(): Record<string, string> {
            return {};
        }

        /**
         * Localized Token Shapes
         */
        static get TOKEN_SHAPES(): Record<string, string> {
            return {};
        }

        /**
         * Maintain a copy of the original to show a real-time preview of changes.
         */
        protected _preview: TokenDocument | PrototypeToken<Actor> | null = null;

        /**
         * Is the token a PrototypeToken?
         */
        abstract isPrototype: boolean;

        /**
         * A reference to the Actor the token depicts
         */
        abstract get actor(): Actor | null;

        /**
         * The TokenDocument or PrototypeToken
         */
        abstract get token(): TokenDocument | PrototypeToken<Actor>;

        /**
         * The schema fields for this token DataModel
         */
        protected abstract get _fields(): DataSchema;

        /**
         * Assign a preview clone for propagating form changes across the sheet and (if editing a TokenDocument) the
         * canvas.
         */
        protected abstract _initializeTokenPreview(): Promise<void>;

        protected override async _preFirstRender(
            context: Record<string, unknown>,
            options: HandlebarsRenderOptions,
        ): Promise<void> {
            context;
            options;
        }

        /**
         * Mimic changes to the Token document as if they were true document updates.
         * @param The changes to preview.
         */
        protected _previewChanges(changes: Record<string, unknown>): void {
            changes;
        }

        protected override async _prepareContext(options: HandlebarsRenderOptions): Promise<ApplicationRenderContext> {
            options;
            return {};
        }

        protected override async _preparePartContext(
            partId: string,
            context: ApplicationRenderContext,
            options: HandlebarsRenderOptions,
        ): Promise<ApplicationRenderContext> {
            context = await super._preparePartContext(partId, context, options);
            return context;
        }

        /**
         * Prepare data to be displayed in the Identity tab.
         */
        protected _prepareIdentityTab(): object {
            return {};
        }

        /**
         * Prepare data to be displayed in the Appearance tab.
         */
        protected async _prepareAppearanceTab(): Promise<object> {
            return {};
        }

        /**
         * Prepare data to be displayed in the Vision tab.
         */
        protected async _prepareVisionTab(): Promise<object> {
            return {};
        }

        /**
         * Prepare data to be displayed in the Vision tab.
         */
        protected async _prepareLightTab(): Promise<object> {
            return {};
        }

        /**
         * Prepare data to be displayed in the Resources tab.
         */
        protected async _prepareResourcesTab(): Promise<object> {
            return {};
        }

        /**
         * Prepare form submission buttons.
         */
        protected _prepareButtons(): FormFooterButton[] {
            return [];
        }

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        protected override _onChangeForm(formConfig: ApplicationFormConfiguration, event: Event): void {
            formConfig;
            event;
        }

        /* -------------------------------------------- */
        /*  Form Submission                             */
        /* -------------------------------------------- */

        /**
         * Process several fields from form submission data into proper model changes.
         * @param submitData Form submission data passed through {@link foundry.applications.ux.FormDataExtended}
         */
        protected _processChanges(submitData: Record<string, unknown>): void {
            submitData;
        }
    }
    return TokenApplication;
}
