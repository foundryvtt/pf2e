import type { ApplicationConfiguration } from "../_types.d.ts";
import type HandlebarsApplicationMixin from "../api/handlebars-application.d.ts";
import type { HandlebarsRenderOptions, HandlebarsTemplatePart } from "../api/handlebars-application.d.ts";
import type BasePlaceableHUD from "./placeable-hud.d.mts";
import type { PlaceableHUDContext } from "./placeable-hud.d.mts";

/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for Tile objects.
 * The TileHUD implementation can be configured and replaced via {@link CONFIG.Tile.hudClass}.
 */
export default class TileHUD extends HandlebarsApplicationMixin(BasePlaceableHUD) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    override _prepareContext(options: HandlebarsRenderOptions): Promise<PlaceableHUDContext>;
}
