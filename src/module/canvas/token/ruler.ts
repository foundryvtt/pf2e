import type { TokenRulerData, TokenRulerWaypoint } from "@client/_types.d.mts";
import type { WaypointLabelRenderContext } from "@client/canvas/placeables/tokens/ruler.d.mts";
import { TokenMeasuredMovementWaypoint } from "@client/documents/_types.mjs";
import { Point, Rectangle } from "@common/_types.mjs";
import { ErrorPF2e } from "@util";
import * as R from "remeda";
import type { TokenPF2e } from "./index.ts";

class TokenRulerPF2e extends foundry.canvas.placeables.tokens.TokenRuler<TokenPF2e> {
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
    #renderedPath: PIXI.Graphics | null = null;

    readonly #glyphMarkedPoints: (Rectangle & { actionsSpent: number })[] = [];

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
        const maybeWithBumps = game.pf2e.settings.bumpities ? this.#spliceTerrainBumps(rulerData) : rulerData;
        super.refresh(maybeWithBumps);
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

    /** Add erratically-placed, unmeasured waypoints to indicate difficult terrain. */
    #spliceTerrainBumps(rulerData: DeepReadonly<TokenRulerData>): DeepReadonly<TokenRulerData> {
        const planned = { ...rulerData.plannedMovement };
        for (const [key, movement] of Object.entries(planned)) {
            const foundPath = [...movement.foundPath];
            for (let i = 1; i < movement.foundPath.length; i++) {
                const waypoint = movement.foundPath[i];
                const difficulty = waypoint.terrain?.difficulty ?? 1;
                if (difficulty > 1)
                    foundPath.splice(
                        foundPath.indexOf(waypoint),
                        0,
                        ...this.#createTerrainBumps(waypoint, foundPath[i - 1]),
                    );
            }
            planned[key] = { ...movement, foundPath };
        }
        return { ...rulerData, plannedMovement: planned };
    }

    /** Create a sequence of terrain bumps between two standard waypoints. */
    #createTerrainBumps(
        waypoint: DeepReadonly<TokenMovementBump>,
        prior: DeepReadonly<TokenMovementBump>,
    ): DeepReadonly<TokenMovementBump>[] {
        const halfGrid = canvas.grid.size / 2;
        const toNearestHalfGrid = (point: Point): Point => {
            const x = Math.round(point.x / halfGrid) * halfGrid;
            const y = Math.round(point.y / halfGrid) * halfGrid;
            return { x, y };
        };
        const Ray = fc.geometry.Ray;
        const waypointSegment = new Ray(toNearestHalfGrid(prior), toNearestHalfGrid(waypoint));
        const bumpsSegment = new Ray(waypointSegment.A, waypointSegment.project(1));
        const bumps: DeepReadonly<TokenMeasuredMovementWaypoint>[] = [];
        const twister = new foundry.dice.MersenneTwister(Number(`${waypoint.x}${waypoint.y}`));
        const max = Math.round(12 * (waypointSegment.distance / canvas.grid.size));
        for (let i = 0; i < max; i++) {
            const projected = bumpsSegment.project((i + 1) / (max + 1));
            const angle = bumpsSegment.angle + (Math.PI / 2) * (i % 2 === 0 ? 1 : -1);
            const distance = [0, max - 1].includes(i) ? 0 : Math.floor(twister.rnd() * (canvas.grid.size / 10));
            const point = Ray.fromAngle(projected.x, projected.y, angle, distance).B;
            bumps.push(this.#createBump(prior, point));
        }
        return bumps;
    }

    /** Create a single bump waypoint. */
    #createBump(waypoint: DeepReadonly<TokenMeasuredMovementWaypoint>, point: Point): DeepReadonly<TokenMovementBump> {
        return Object.assign(fu.deepClone(waypoint), {
            x: Math.round(point.x),
            y: Math.round(point.y),
            bump: true,
            cost: 0,
            intermediate: false,
            checkpoint: false,
            explicit: false,
            terrain: null,
        });
    }

    /** Include action-cost information for showing a glyph. */
    protected override _getWaypointLabelContext(
        waypoint: DeepReadonly<TokenRulerWaypoint & { bump?: boolean }>,
        state: object,
    ): WaypointLabelRenderContext | void {
        if (waypoint.bump) return undefined;
        const context: WaypointRenderContextPF2e | void = super._getWaypointLabelContext(waypoint, state);
        if (!context || !canvas.grid.isSquare) return context;
        const speed = this.#getSpeed(waypoint.action);
        if (!speed) return context;
        const accruedCost = waypoint.measurement.cost;
        if (accruedCost > 0 && accruedCost % speed === 0) {
            const actionsSpent = accruedCost / speed;
            const clampedCost = Math.clamp(actionsSpent, 1, 3);
            context.actionCost = { actions: clampedCost, overage: actionsSpent - accruedCost > 0 };
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
        if (!actor?.isOfType("creature") || !actor.isOwner || actor.alliance !== "party") return null;
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
        const path = this.#renderedPath;
        if (!path || !waypoint.intermediate || waypoint.hidden || waypoint.cost === 0) return;
        const speed = this.#getSpeed(waypoint.action);
        if (!speed) return;
        const measurement = waypoint.measurement;
        const remainder = measurement.cost % speed;
        const markedPoints = this.#glyphMarkedPoints;
        const tokenRect = R.pick(waypoint, ["x", "y", "width", "height"]);
        if (remainder === 0) {
            markedPoints.push(Object.assign(tokenRect, { actionsSpent: measurement.cost / speed }));
        } else if (remainder === speed - 5 && measurement.diagonals > 0 && measurement.diagonals % 2 === 1) {
            // The movement cost of reaching this square wouldn't increasing the action cost, but reaching the next
            // would increase the cost and move an additional 5 feet due to diagonals.
            const totalCost = measurement.cost + 5;
            const nextCost = waypoint.next?.measurement.cost ?? NaN;
            const actionsSpent = totalCost / speed;
            if (nextCost % speed !== 0) markedPoints.push(Object.assign(tokenRect, { actionsSpent }));
        }
    }

    /** Render action glyphs at marked intermediate waypoints. */
    async #renderActionGlyphs(): Promise<void> {
        const labelsEl = this.#labelsEl;
        labelsEl.dataset.glyphMarked = "";
        const templatePath = TokenRulerPF2e.ACTION_MARKER_TEMPLATE;
        const uiScale = canvas.dimensions.uiScale;
        for (const point of this.#glyphMarkedPoints) {
            const center = { x: (point.width * canvas.grid.size) / 2, y: (point.height * canvas.grid.size) / 2 };
            const cost = Math.clamp(point.actionsSpent, 1, 3);
            const overage = point.actionsSpent - cost > 0;
            const offset = { x: 4 * (cost + 3 * Number(overage) - 1) + 14, y: 20 };
            const position = {
                x: Math.round(point.x + center.x - offset.x * uiScale),
                y: Math.round(point.y + center.y - offset.y * uiScale),
            };
            const html = await fa.handlebars.renderTemplate(templatePath, { cost, overage, position });
            labelsEl.insertAdjacentHTML("beforeend", html);
        }
    }
}

interface WaypointRenderContextPF2e extends WaypointLabelRenderContext {
    actionCost?: { actions: number; overage: boolean };
}

interface TokenMovementBump extends TokenMeasuredMovementWaypoint {
    bump?: boolean;
}

export { TokenRulerPF2e, type TokenMovementBump };
