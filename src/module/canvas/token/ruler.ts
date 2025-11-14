import { MOVEMENT_TYPES } from "@actor/values.ts";
import type { TokenRulerData, TokenRulerWaypoint } from "@client/_types.d.mts";
import type {
    WaypointLabelRenderContext,
    WaypointLabelRenderState,
} from "@client/canvas/placeables/tokens/ruler.d.mts";
import { Rectangle } from "@common/_types.mjs";
import { tupleHasValue } from "@util";
import * as R from "remeda";
import type { TokenPF2e } from "./index.ts";

export class TokenRulerPF2e extends foundry.canvas.placeables.tokens.TokenRuler<TokenPF2e> {
    static override WAYPOINT_LABEL_TEMPLATE = `${SYSTEM_ROOT}/templates/scene/token/ruler/waypoint-label.hbs`;

    static ACTION_MARKER_TEMPLATE = `${SYSTEM_ROOT}/templates/scene/token/ruler/action-marker.hbs`;

    static #hudContainerObserver = new MutationObserver(() => {
        TokenRulerPF2e.#counterAlign();
    });

    /** Observe changes to the attributes of the HeadsUpDisplayContainer's element. */
    static observeHudContainer(): void {
        TokenRulerPF2e.#hudContainerObserver.disconnect();
        TokenRulerPF2e.#hudContainerObserver.observe(canvas.hud.element, { attributes: true });
        TokenRulerPF2e.#counterAlign();
    }

    /** The value of the parent class's own #path property */
    #renderedPath: PIXI.Graphics | null = null;

    readonly #glyphMarkedPoints: (Rectangle & { actionsSpent: number })[] = [];

    #labelsObserver: MutationObserver | null = null;

    /** Retrieve the ruler-labels container for this token.  */
    get #labelsEl(): HTMLElement | null {
        return document.getElementById(`token-ruler-${this.token.document.id}`);
    }

    /** Recalculate the counter-scale. */
    static #counterAlign(): void {
        const style = document.getElementById("measurement")?.style;
        style?.setProperty("--counter-scale", (1 / canvas.stage.scale.x).toFixed(4));
    }

    /** Fish out the value of the parent class's hard-private #path property. */
    override async draw(): Promise<void> {
        await super.draw();
        if (!canvas.grid.isSquare) return;
        const path = canvas.tokens._rulerPaths.children.at(-1);
        this.#renderedPath = path instanceof PIXI.Graphics ? path : null;
        await fa.handlebars.getTemplate(TokenRulerPF2e.ACTION_MARKER_TEMPLATE);
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

    /** Start observing the measurement container to append action glyphs after ruler labels are drawn. */
    override refresh(rulerData: DeepReadonly<TokenRulerData>): void {
        if (!canvas.grid.isSquare) return super.refresh(rulerData);
        this.#glyphMarkedPoints.length = 0;
        super.refresh(rulerData);
        if (canvas.ready && canvas.grid.isSquare) {
            const labelsEl = this.#labelsEl;
            delete labelsEl?.dataset.glyphMarked;
            if (labelsEl && !this.#labelsObserver) {
                this.#labelsObserver = new MutationObserver(() => {
                    if (!("glyphMarked" in labelsEl.dataset)) this.#renderActionGlyphs();
                });
                this.#labelsObserver.observe(labelsEl, { childList: true });
            }
        }
    }

    /** Retrieve the actor's speed of a certain movement type, if any. */
    #getSpeed(rulerAction: string): number | null {
        const actor = this.token.actor;
        if (!actor?.isOwner && actor?.alliance !== "party") return null;
        if (actor.isOfType("creature")) {
            const speeds = actor.system.movement.speeds;
            switch (rulerAction) {
                case "walk":
                    return speeds.land.value;
                case "crawl":
                    return speeds.land.crawl;
                case "step":
                    return speeds.land.step;
                default:
                    return tupleHasValue(MOVEMENT_TYPES, rulerAction) ? (speeds[rulerAction]?.value ?? null) : null;
            }
        }
        if (actor.isOfType("vehicle")) return actor.system.movement.speeds.drive.value;
        return null;
    }

    /** Include action-cost information for showing a glyph. */
    protected override _getWaypointLabelContext(
        waypoint: DeepReadonly<TokenRulerWaypoint>,
        state: WaypointLabelRenderState,
    ): WaypointLabelRenderContext | void {
        if (waypoint.action === "displace") return;
        const context: WaypointRenderContextPF2e | void = super._getWaypointLabelContext(waypoint, state);
        if (!context || !canvas.grid.isSquare) return context;

        const speed = this.#getSpeed(waypoint.action);
        if (!speed) return context;

        const measurement = waypoint.measurement;
        const accruedCost = measurement.cost;
        const deltaDistance = measurement.backward?.distance ?? 0;
        context.cost.additional = {
            total: Math.max(0, measurement.cost - measurement.distance),
            delta: Math.max(0, waypoint.cost - deltaDistance),
        };
        if (accruedCost > 0 && (!waypoint.next || accruedCost % speed === 0)) {
            const actionsSpent = Math.ceil(accruedCost / speed);
            const clampedCost = Math.clamp(actionsSpent, 1, 3);
            context.actionCost = { actions: clampedCost, overage: actionsSpent > 3 };
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

    /** If the provided waypoint should have an action glyph, track it for later rendering. */
    #logGlyphMarkedPoint(waypoint: DeepReadonly<Omit<TokenRulerWaypoint, "index" | "center" | "size" | "ray">>): void {
        const path = this.#renderedPath;
        if (!path || !waypoint.intermediate || waypoint.hidden || waypoint.cost === 0) return;
        const speed = this.#getSpeed(waypoint.action);
        if (!speed) return;
        const measurement = waypoint.measurement;
        const remainder = measurement.cost % speed;
        const markedPoints = this.#glyphMarkedPoints;
        const tokenRect = R.pick(waypoint, ["x", "y", "width", "height"]);
        const squareLength = canvas.grid.distance;
        const nextCost = measurement.forward?.cost ?? 0;
        if (remainder === 0) {
            markedPoints.push(Object.assign(tokenRect, { actionsSpent: measurement.cost / speed }));
        } else if ([speed - nextCost, speed - (nextCost - squareLength)].includes(remainder)) {
            // The movement cost of reaching this square wouldn't increasing the action cost, but reaching the next
            // would increase the cost and move an additional amount due to diagonals or difficult terrain
            const totalCost = measurement.cost + nextCost;
            const actionsSpent = Math.floor(totalCost / speed);
            if (totalCost % speed !== 0) markedPoints.push(Object.assign(tokenRect, { actionsSpent }));
        }
    }

    /** Render action glyphs at marked intermediate waypoints. */
    async #renderActionGlyphs(): Promise<void> {
        const labelsEl = this.#labelsEl;
        if (!labelsEl) return;
        labelsEl.dataset.glyphMarked = "";
        const templatePath = TokenRulerPF2e.ACTION_MARKER_TEMPLATE;
        for (const point of this.#glyphMarkedPoints) {
            const cost = Math.clamp(point.actionsSpent, 1, 3);
            const overage = point.actionsSpent - cost > 0;
            const html = await fa.handlebars.renderTemplate(templatePath, { cost, overage });
            const element = fu.parseHTML(html) as HTMLElement;
            const topLeft = canvas.grid.getTopLeftPoint(point);
            element.style.setProperty("--position-x", `${Math.round(topLeft.x)}px`);
            element.style.setProperty("--position-y", `${Math.round(topLeft.y)}px`);
            element.style.setProperty("--ui-scale", canvas.dimensions.uiScale.toString());
            labelsEl.append(element);
        }
    }
}

interface WaypointRenderContextPF2e extends WaypointLabelRenderContext {
    actionCost?: { actions: number; overage: boolean };
    cost: {
        total: string;
        units: string;
        additional?: { total: number; delta: number };
    };
}
