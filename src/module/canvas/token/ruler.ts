import type { WaypointRenderContext } from "@client/canvas/placeables/tokens/ruler.d.mts";
import { getActionGlyph } from "@util";
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

    protected override _getWaypointLabelContext(
        waypoint: DeepReadonly<foundry.TokenRulerWaypoint>,
        state: { hasElevation: boolean; previousElevation: number },
    ): WaypointRenderContextPF2e | void {
        const context = super._getWaypointLabelContext(waypoint, state) as WaypointRenderContextPF2e | void;
        if (!context) return context;

        const speed = this.#getActorSpeed(waypoint.action);
        if (!speed) return context;

        const actionCost = Math.ceil(waypoint.measurement.cost / speed);
        if (actionCost) {
            context.pf2e = {
                actionCost,
                actionGlyph: getActionGlyph(actionCost < 4 ? actionCost : 3),
            };
        }

        return context;
    }

    #getActorSpeed(action: string): number {
        const actor = this.token.actor;
        if (!actor) return 0;

        switch (action) {
            case "burrow":
            case "climb": {
                if (actor.isOfType("creature")) {
                    return actor.system.attributes.speed.otherSpeeds.find((s) => s.type === action)?.total ?? 0;
                }
                break;
            }
            case "crawl": {
                // Requirements You are prone and your Speed is at least 10 feet.
                // You move 5 feet by crawling and continue to stay prone.
                if (actor.isOfType("creature")) {
                    const speed = actor.system.attributes.speed.total;
                    return speed >= 10 ? 5 : 0;
                }
                break;
            }
            case "fly": {
                if (actor.isOfType("creature")) {
                    return actor.system.attributes.speed.otherSpeeds.find((s) => s.type === action)?.total ?? 0;
                } else if (actor.isOfType("vehicle")) {
                    return Number(actor.system.details.speed) || 0;
                }
                break;
            }
            case "swim": {
                if (actor.isOfType("creature")) {
                    return actor.system.attributes.speed.otherSpeeds.find((s) => s.type === action)?.total ?? 0;
                } else if (actor.isOfType("vehicle")) {
                    return Number(actor.system.details.speed) || 0;
                }
                break;
            }
            case "walk": {
                if (actor.isOfType("creature", "party")) {
                    return actor.system.attributes.speed.total;
                } else if (actor.isOfType("vehicle")) {
                    return Number(actor.system.details.speed) || 0;
                }
                break;
            }
        }
        return 0;
    }
}

interface WaypointRenderContextPF2e extends WaypointRenderContext {
    pf2e: {
        actionCost: number;
        actionGlyph: string;
    };
}
