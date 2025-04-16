import type { ApplicationConfiguration } from "../_types.mjs";
import type HandlebarsApplicationMixin from "../api/handlebars-application.mjs";
import type { HandlebarsTemplatePart } from "../api/handlebars-application.mjs";
import type BasePlaceableHUD from "./placeable-hud.mjs";

/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for Drawing objects.
 * The DrawingHUD implementation can be configured and replaced via {@link CONFIG.Drawing.hudClass}.
 */
export default class DrawingHUD extends HandlebarsApplicationMixin(BasePlaceableHUD) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;
}
