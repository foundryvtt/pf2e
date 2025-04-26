import { ChatBubbles } from "@client/canvas/animation/_module.mjs";
import type { ApplicationConfiguration, ApplicationRenderOptions } from "../_types.mjs";
import type ApplicationV2 from "../api/application.mjs";
import type DrawingHUD from "./drawing-hud.mjs";
import type TileHUD from "./tile-hud.mjs";
import type TokenHUD from "./token-hud.mjs";

/**
 * The Heads-Up Display Container is a canvas-sized Application which renders HTML overtop of the game canvas.
 */
export default class HeadsUpDisplayContainer extends ApplicationV2 {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    /** Token HUD */
    token: TokenHUD;

    /** Tile HUD */
    tile: TileHUD;

    /** Drawing HUD */
    drawing: DrawingHUD;

    /** Chat Bubbles */
    bubbles: ChatBubbles;

    override _renderHTML(context: object, options: ApplicationRenderOptions): Promise<string>;

    override _replaceHTML(result: string, content: HTMLElement, options: ApplicationRenderOptions): void;

    override _onRender(context: object, options: ApplicationRenderOptions): Promise<void>;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /** Align the position of the HUD layer to the current position of the canvas */
    align(): void;
}
