import { TokenPF2e } from "./index.ts";

export class TokenRulerPF2e extends foundry.canvas.placeables.tokens.TokenRuler<TokenPF2e> {
    static override WAYPOINT_LABEL_TEMPLATE = "systems/pf2e/templates/scene/token/waypoint-label.hbs";

    static #hudContainerObserver = new MutationObserver(() => {
        TokenRulerPF2e.#counterAlign();
    });

    /** The scale value opposing the one for the HeadsUpDisplayContainer */
    static get #counterScale() {
        return canvas.stage.scale.x * 1.75;
    }

    /** Observe changes to the attributes of the HeadsUpDisplayContainer's element. */
    static observeHudContainer(): void {
        TokenRulerPF2e.#hudContainerObserver.disconnect();
        TokenRulerPF2e.#hudContainerObserver.observe(canvas.hud.element, { attributes: true });
        TokenRulerPF2e.#counterAlign();
    }

    /** Recalculate the counter-scale. */
    static #counterAlign(): void {
        document
            .getElementById("measurement")
            ?.style.setProperty("--counter-scale", TokenRulerPF2e.#counterScale.toFixed(4));
    }
}
