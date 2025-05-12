import { ApplicationConfiguration, ApplicationRenderContext } from "@client/applications/_types.mjs";
import ApplicationV2 from "@client/applications/api/application.mjs";
import HandlebarsApplicationMixin, {
    HandlebarsTemplatePart,
} from "@client/applications/api/handlebars-application.mjs";

/**
 * The application responsible for configuring methods of DiceTerm resolution.
 */
export default class DiceConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /**
     * Register setting and menu.
     */
    static registerSetting(): void;

    /* -------------------------------------------- */
    /*  Application                                 */
    /* -------------------------------------------- */

    override _prepareContext(): Promise<ApplicationRenderContext>;
}
