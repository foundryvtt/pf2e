import type { UserPF2e } from "@module/user/document.ts";
import type { RegionDocumentPF2e, ScenePF2e } from "@scene";
import type { EnvironmentFeatureRegionBehavior } from "@scene/region-behavior/types.ts";
import * as R from "remeda";
import type { TokenPF2e } from "./token/object.ts";

class RulerPF2e<TToken extends TokenPF2e | null = TokenPF2e | null> extends Ruler<TToken, UserPF2e> {
    static override get canMeasure(): boolean {
        return this.#dragMeasurement ? game.activeTool === "ruler" : super.canMeasure;
    }

    /** Whether drag measurement is enabled */
    static get #dragMeasurement(): boolean {
        return game.pf2e.settings.dragMeasurement;
    }

    /** Whether this measurement is being grid-snapped */
    #snap = true;

    /** The footprint of the drag-measured token relative to the origin center */
    #footprint: GridOffset[] = [];

    #exactDestination: Point | null = null;

    /** A grid-snapping mode appropriate for the token's dimensions */
    get #snapMode(): GridSnappingMode {
        const token = this.token;
        const M = CONST.GRID_SNAPPING_MODES;
        if (!token || Math.max(token.document.width, 1) % 2 === 1) {
            return M.CENTER;
        }

        const GT = CONST.GRID_TYPES;
        switch (canvas.grid.type) {
            case GT.HEXEVENQ:
            case GT.HEXEVENR:
                return M.LEFT_SIDE_MIDPOINT;
            case GT.HEXODDR:
                return M.TOP_SIDE_MIDPOINT;
            case GT.SQUARE:
                return M.VERTEX;
            default:
                return M.CENTER;
        }
    }

    get dragMeasurement(): boolean {
        return RulerPF2e.#dragMeasurement && this.#snap;
    }

    get isMeasuring(): boolean {
        return this.state === RulerPF2e.STATES.MEASURING;
    }

    /** Add a waypoint at the currently-drawn destination. */
    saveWaypoint(): void {
        if (!this.dragMeasurement) return;

        const point = this.destination;
        if (point) {
            const snap = !game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT);
            this._addWaypoint(point, { snap });
        }
    }

    startDragMeasurement(event: TokenPointerEvent<NonNullable<TToken>>): void {
        const token = event.interactionData.object;
        if (!this.dragMeasurement || !token || game.activeTool === "ruler") {
            return;
        }
        const snap = !event.shiftKey;
        token.document.locked = true;
        const center = canvas.grid.getOffset(canvas.grid.getCenterPoint(token.center));
        this.#footprint = token.footprint.map((o) => ({ i: o.i - center.i, j: o.j - center.j }));
        this.#snap = snap;

        return this._startMeasurement(token.center, { snap, token });
    }

    /**
     * @param [exactDestination] The coordinates of the dragged token preview, if any
     */
    async finishDragMeasurement(exactDestination: Point | null = null): Promise<boolean | void> {
        if (!this.dragMeasurement) return;
        if (this.token) {
            this.token.document.locked = this.token.document._source.locked;
            if (!this.isMeasuring) canvas.mouseInteractionManager.cancel();
            // Special consideration for tiny tokens: allow them to move within a square
            this.#exactDestination = exactDestination;
            if (exactDestination && this.token.document.width < 1) {
                const lastSegment = this.segments.at(-1);
                if (lastSegment) {
                    lastSegment.ray = new Ray(R.pick(this.token, ["x", "y"]), exactDestination);
                }
            }
            return this.moveToken().then(() => {
                this.#exactDestination = null;
            });
        }

        return this._endMeasurement();
    }

    /** Prevent inclusion of a token when using the ruler tool. */
    protected override _startMeasurement(origin: Point, options: { snap?: boolean; token?: TToken | null } = {}): void {
        if (game.activeTool === "ruler") options.token = null;
        return super._startMeasurement(origin, options);
    }

    /** Calculate cost as an addend to distance due to difficult terrain. */
    protected override _getCostFunction(): GridMeasurePathCostFunction | undefined {
        const isCreature = !!this.token?.actor?.isOfType("creature");
        if (!this.dragMeasurement || !isCreature || canvas.regions.placeables.length === 0) {
            return;
        }

        return (_from: GridOffset, to: GridOffset, distance: number): number => {
            const token = canvas.controls.ruler.token;
            if (!token) return 0;

            const toPoint = canvas.grid.getTopLeftPoint(to);
            const difficultBehaviors = canvas.regions.placeables
                .filter(
                    (r) =>
                        r.document.behaviors.some(
                            (b) => b.type === "environmentFeature" && b.system.terrain.difficult > 0,
                        ) && token.testInsideRegion(r, toPoint),
                )
                .flatMap((r) =>
                    r.document.behaviors.filter(
                        (b): b is EnvironmentFeatureRegionBehavior<RegionDocumentPF2e<ScenePF2e>> =>
                            b.type === "environmentFeature" && b.system.terrain.difficult > 0,
                    ),
                );

            return difficultBehaviors.length > 0
                ? difficultBehaviors.some((b) => b.system.terrain.difficult === 2)
                    ? distance + 10
                    : distance + 5
                : distance;
        };
    }

    protected override _getMeasurementOrigin(point: Point, { snap = true } = {}): Point {
        if (!this.dragMeasurement || !this.token || !snap) {
            return super._getMeasurementOrigin(point, { snap });
        }
        return canvas.grid.getSnappedPoint(point, { mode: this.#snapMode });
    }

    protected override _getMeasurementDestination(point: Point, { snap = true }: { snap?: boolean } = {}): Point {
        if (!this.dragMeasurement || !this.token || !snap) {
            return super._getMeasurementDestination(point, { snap });
        }
        return canvas.grid.getSnappedPoint(point, { mode: this.#snapMode });
    }

    /** Widen the ruler when measuring with larger tokens. */
    protected override _highlightMeasurementSegment(segment: RulerMeasurementSegment): void {
        const token = this.token;
        if (segment.teleport || !this.dragMeasurement || !token) {
            return super._highlightMeasurementSegment(segment);
        }

        // Keep track of grid spaces set to be highlighed in order to skip repeated highlighting
        const seen = new Set<number>();
        for (const offset of canvas.grid.getDirectPath([segment.ray.A, segment.ray.B])) {
            for (const stomp of this.#footprint) {
                const newOffset = { i: offset.i + stomp.i, j: offset.j + stomp.j };
                const packed = (newOffset.i << 16) + newOffset.j;
                if (!seen.has(packed)) {
                    seen.add(packed);
                    const point = canvas.grid.getTopLeftPoint(newOffset);
                    canvas.interface.grid.highlightPosition(this.name, { ...point, color: this.color });
                }
            }
        }
    }

    protected override _animateSegment(
        token: TToken,
        segment: RulerMeasurementSegment,
        destination: Point,
    ): Promise<unknown> {
        if (this.dragMeasurement && this.#exactDestination && token && token.w < canvas.grid.sizeX) {
            const exactDestination = this.#exactDestination;
            const adjustedDestination = exactDestination ? exactDestination : destination;
            return super._animateSegment(token, segment, adjustedDestination);
        }
        return super._animateSegment(token, segment, destination);
    }

    /** If measuring with a token, only broadcast during an encounter. */
    protected override _broadcastMeasurement(): void {
        if (!this.dragMeasurement || game.activeTool === "ruler" || game.combat?.started) {
            return super._broadcastMeasurement();
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Prevent behavior from keybind modifiers if token drag measurement is enabled. */
    override _onMouseUp(event: PlaceablesLayerPointerEvent<NonNullable<TToken>>): void {
        if (this.dragMeasurement) {
            event.ctrlKey = false;
            event.metaKey = false;
            if (game.activeTool === "ruler") return this._endMeasurement();
        }
        return super._onMouseUp(event);
    }

    /** Prevent behavior from movement keys (typically Space) if token drag measurement is enabled. */
    override _onMoveKeyDown(context: KeyboardEventContext): void {
        if (!this.dragMeasurement) super._onMoveKeyDown(context);
    }

    onDragMeasureMove(event: TokenPointerEvent<NonNullable<TToken>>): void {
        if (this.dragMeasurement) this._onMouseMove(event);
    }

    onDragLeftCancel(event?: TokenPointerEvent<NonNullable<TToken>>): void {
        if (!this.dragMeasurement || !this.isMeasuring) return;

        this._removeWaypoint();
        // Prevent additional events from firing for dragged token
        if (this.isMeasuring) {
            event?.preventDefault();
        } else {
            canvas.mouseInteractionManager.cancel();
        }
    }
}

export { RulerPF2e };
