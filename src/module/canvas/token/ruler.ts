import type { TokenRulerData, TokenRulerWaypoint } from "@client/_types.d.mts";
import type { WaypointLabelRenderContext } from "@client/canvas/placeables/tokens/ruler.d.mts";
import { ErrorPF2e } from "@util";
import type { TokenPF2e } from "./index.ts";

export class TokenRulerPF2e extends foundry.canvas.placeables.tokens.TokenRuler<TokenPF2e> {
    static override WAYPOINT_LABEL_TEMPLATE = "systems/pf2e/templates/scene/token/ruler/waypoint-label.hbs";

    static ACTION_MARKER_TEMPLATE = "systems/pf2e/templates/scene/token/ruler/action-marker.hbs";

    static #hudContainerObserver = new MutationObserver(() => {
        TokenRulerPF2e.#counterAlign();
    });

    /** A scale value to counter the one for the HeadsUpDisplayContainer */
    static get #counterScale() {
        return canvas.stage.scale.x * 1.75;
    }

    /** Observe changes to the attributes of the HeadsUpDisplayContainer's element. */
    static observeHudContainer(): void {
        TokenRulerPF2e.#hudContainerObserver.disconnect();
        TokenRulerPF2e.#hudContainerObserver.observe(canvas.hud.element, { attributes: true });
        TokenRulerPF2e.#counterAlign();
    }

    /** The value of the parent class's own #path property */
    #path: PIXI.Graphics | null = null;

    readonly #glyphMarkedPoints: { x: number; y: number; actionsSpent: number }[] = [];

    #labelsObserver: MutationObserver | null = null;

    /** Retrieve the ruler-labels container for this token.  */
    get #labelsEl(): HTMLElement {
        const labelsEl = document.getElementById(`token-ruler-${this.token.document.id}`);
        if (!labelsEl) throw ErrorPF2e("Unexpected failure looking up ruler labels element");
        return labelsEl;
    }

    /** Recalculate the counter-scale. */
    static #counterAlign(): void {
        document
            .getElementById("measurement")
            ?.style.setProperty("--counter-scale", TokenRulerPF2e.#counterScale.toFixed(4));
    }

    /** Fish out the value of the parent class's hard-private #path property. */
    override async draw(): Promise<void> {
        await super.draw();
        if (!canvas.grid.isSquare) return;
        const path = this.token.layer._rulerPaths.children.at(-1);
        this.#path = path instanceof PIXI.Graphics ? path : null;
        await fa.handlebars.getTemplate(TokenRulerPF2e.ACTION_MARKER_TEMPLATE);
    }

    /** Start observing the measurement container to append action glyphs after ruler labels are drawn. */
    override refresh(rulerData: DeepReadonly<TokenRulerData>): void {
        this.#glyphMarkedPoints.length = 0;
        super.refresh(rulerData);
        if (canvas.ready && canvas.grid.isSquare) {
            const labelsEl = this.#labelsEl;
            delete labelsEl.dataset.glyphMarked;
            if (!this.#labelsObserver) {
                this.#labelsObserver = new MutationObserver(() => {
                    if (!("glyphMarked" in labelsEl.dataset)) this.#renderActionGlyphs();
                });
                this.#labelsObserver.observe(labelsEl, { childList: true });
            }
        }
    }

    override clear(): void {
        super.clear();
        this.#glyphMarkedPoints.length = 0;
    }

    override destroy(): void {
        super.destroy();
        this.#glyphMarkedPoints.length = 0;
        this.#labelsObserver?.disconnect();
        this.#labelsObserver = null;
    }

    /** Include action-cost information for showing a glyph. */
    protected override _getWaypointLabelContext(
        waypoint: DeepReadonly<TokenRulerWaypoint>,
        state: object,
    ): WaypointLabelRenderContext | void {
        const context: WaypointRenderContextPF2e | void = super._getWaypointLabelContext(waypoint, state);
        if (!context || !canvas.grid.isSquare) return;
        const speed = this.#getSpeed(waypoint.action);
        if (!speed) return context;
        if (waypoint.measurement.cost % speed === 0) {
            const actionsSpent = waypoint.measurement.cost / speed;
            const cost = Math.clamp(actionsSpent, 1, 3);
            context.actionCost = { actions: cost, overage: actionsSpent - cost > 0 };
        }
        return context;
    }

    /** Abuse this method to log intermediate waypoints that should be rendered with action glyphs. */
    protected override _getGridHighlightStyle(
        waypoint: DeepReadonly<Omit<TokenRulerWaypoint, "index" | "center" | "size" | "ray">>,
        offset: DeepReadonly<foundry.grid.GridOffset3D>,
    ): { color?: PIXI.ColorSource; alpha?: number; texture?: PIXI.Texture; matrix?: PIXI.Matrix | null } {
        this.#logGlyphMarkedPoint(waypoint);
        return super._getGridHighlightStyle(waypoint, offset);
    }

    /** Retrieve the actor's speed of a certain movement type, if any. */
    #getSpeed(rulerAction: string): number | null {
        const actor = this.token.actor;
        if (!actor?.isOfType("creature")) return null;
        const speeds = actor.system.attributes.speed;
        switch (rulerAction) {
            case "walk":
                return speeds.total;
            case "crawl":
                return 5;
            default:
                return speeds.otherSpeeds.find((s) => s.type === rulerAction)?.total ?? null;
        }
    }

    /** If the provided waypoint should have an action glyph, track it for later rendering. */
    #logGlyphMarkedPoint(waypoint: DeepReadonly<Omit<TokenRulerWaypoint, "index" | "center" | "size" | "ray">>): void {
        const path = this.#path;
        if (!path || !waypoint.intermediate || waypoint.hidden || waypoint.cost === 0) return;
        const speed = this.#getSpeed(waypoint.action);
        if (!speed) return;
        const measurement = waypoint.measurement;
        const remainder = measurement.cost % speed;
        const markedPoints = this.#glyphMarkedPoints;
        if (remainder === 0) {
            markedPoints.push({ x: waypoint.x, y: waypoint.y, actionsSpent: measurement.cost / speed });
        } else if (remainder === speed - 5 && measurement.diagonals > 0 && measurement.diagonals % 2 === 1) {
            // The movement cost of reaching this square wouldn't increasing the action cost, but reaching the next
            // would increase the cost and move an additional 5 feet due to diagonals.
            const totalCost = measurement.cost + 5;
            const nextCost = waypoint.next?.measurement.cost ?? NaN;
            const actionsSpent = totalCost / speed;
            if (nextCost % speed !== 0) markedPoints.push({ x: waypoint.x, y: waypoint.y, actionsSpent });
        }
    }

    /** Render action glyphs at marked intermediate waypoints. */
    async #renderActionGlyphs(): Promise<void> {
        const labelsEl = this.#labelsEl;
        labelsEl.dataset.glyphMarked = "";
        const templatePath = TokenRulerPF2e.ACTION_MARKER_TEMPLATE;
        const tokenBounds = this.token.mechanicalBounds;
        const uiScale = canvas.dimensions.uiScale;
        for (const point of this.#glyphMarkedPoints) {
            const { x, y, actionsSpent } = point;
            const cost = Math.clamp(actionsSpent, 1, 3);
            const overage = actionsSpent - cost > 0;
            const offset = { x: 4 * (cost + 3 * Number(overage) - 1), y: 4 };
            const position = {
                x: Math.round(x + tokenBounds.width / 2 - (16 + offset.x) * uiScale),
                y: Math.round(y + tokenBounds.height / 2 - (16 + offset.y) * uiScale),
            };
            const html = await fa.handlebars.renderTemplate(templatePath, { cost, overage, position });
            labelsEl.insertAdjacentHTML("beforeend", html);
        }
    }
}

interface WaypointRenderContextPF2e extends WaypointLabelRenderContext {
    actionCost?: { actions: number; overage: boolean };
}
