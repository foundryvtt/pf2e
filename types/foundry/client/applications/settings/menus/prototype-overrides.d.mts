import { ApplicationConfiguration, ApplicationRenderContext } from "@client/applications/_types.mjs";
import {
    ApplicationV2,
    HandlebarsApplicationMixin,
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../../api/_module.mjs";

/**
 * A submenu for managing user overrides of PrototypeTokens
 */
export default class PrototypeOverridesConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /** Register this menu application and the setting it manages. */
    static registerSettings(): void;

    override tabGroups: Record<string, string>;

    protected override _prepareContext(): Promise<ApplicationRenderContext>;

    protected override _preFirstRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;
}
