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
        const setting = game.pf2e.settings.dragMeasurement;
        return setting === "always" || (setting === "encounters" && !!game.combat?.active);
    }

    static get hasModuleConflict(): boolean {
        return ["drag-ruler", "elevationruler", "pf2e-ruler"].some((id) => game.modules.get(id)?.active);
    }

    /** The footprint of the drag-measured token relative to the origin center */
    #footprint: GridOffset[] = [];

    /** Grid spaces highlighted for the current measurement */
    #highlighted = new Set<number>();

    #exactDestination: Point | null = null;

    /** A grid-snapping mode appropriate for the token's dimensions */
    get #snapMode(): GridSnappingMode {
        const token = this.token;
        const M = CONST.GRID_SNAPPING_MODES;
        if (!token || Math.max(token.document.width, 1) % 2 === 1) {
            return M.CENTER;
        }

        return M.BOTTOM_RIGHT_VERTEX;
    }

    get dragMeasurement(): boolean {
        return RulerPF2e.#dragMeasurement && (game.activeTool === "ruler" || canvas.tokens.controlled.length <= 1);
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
        token.document.locked = true;
        return this._startMeasurement(token.center, { snap: !event.shiftKey, token });
    }

    /**
     * @param [exactDestination] The coordinates of the dragged token preview, if any
     */
    async finishDragMeasurement(
        event: TokenPointerEvent<NonNullable<TToken>>,
        exactDestination: Point | null = null,
    ): Promise<boolean | void> {
        if (!this.dragMeasurement) return;
        if (this.token) {
            this.token.document.locked = this.token.document._source.locked;
            if (!this.isMeasuring) canvas.mouseInteractionManager.cancel();
            // If snapping, adjust the token document's current position to prevent upstream from "correcting" it
            if (!event.shiftKey) {
                const { x, y } = this.token.getSnappedPosition();
                this.token.document.x = x;
                this.token.document.y = y;
            }
            // Special consideration for tiny tokens: allow them to move within a square
            this.#exactDestination = exactDestination;
            if (exactDestination && this.token.document.width < 1) {
                const lastSegment = this.segments.at(-1);
                if (lastSegment) {
                    lastSegment.ray = new Ray(R.pick(this.token, ["x", "y"]), exactDestination);
                }
            }
            return this.moveToken();
        }

        return this._endMeasurement();
    }

    /** Acquire the token's footprint for drag measurement. */
    override measure(
        destination: Point,
        options?: { snap?: boolean; force?: boolean },
    ): void | RulerMeasurementSegment[] {
        if (this.dragMeasurement && this.token && this.origin) {
            const offset = canvas.grid.getOffset(this.origin);
            this.#footprint = this.token.footprint.map((o) => ({ i: o.i - offset.i, j: o.j - offset.j }));
        }
        return super.measure(destination, options);
    }

    /** Allow GMs to move tokens through walls when drag-measuring. */
    protected override _canMove(token: TToken): boolean {
        if (!game.user.isGM || !this.dragMeasurement) return super._canMove(token);
        try {
            return super._canMove(token);
        } catch (error) {
            if (error instanceof Error && error.message === "RULER.MovementCollision") {
                return true;
            } else {
                throw error;
            }
        }
    }

    /** Prevent inclusion of a token when using the ruler tool. */
    protected override _startMeasurement(origin: Point, options: { snap?: boolean; token?: TToken | null } = {}): void {
        if (game.activeTool === "ruler" && this.dragMeasurement) {
            options.token = null; // Setting to null prevents looking up a default
        }

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

    protected override _getMeasurementOrigin(point: Point, options?: { snap?: boolean }): Point {
        if (!this.dragMeasurement || !this.token || options?.snap === false) {
            return super._getMeasurementOrigin(point, options);
        }
        return canvas.grid.getSnappedPoint(point, { mode: this.#snapMode });
    }

    protected override _getMeasurementDestination(point: Point, options?: { snap?: boolean }): Point {
        if (!this.dragMeasurement || !this.token || options?.snap === false) {
            return super._getMeasurementDestination(point, options);
        }
        return canvas.grid.getSnappedPoint(point, { mode: this.#snapMode });
    }

    /** Widen the ruler when measuring with larger tokens. */
    protected override _highlightMeasurementSegment(segment: RulerMeasurementSegment): void {
        const token = this.token;
        if (segment.teleport || !this.dragMeasurement || !token) {
            return super._highlightMeasurementSegment(segment);
        }

        this.#highlighted.clear();
        if (canvas.grid.isHexagonal) {
            this.#highlightHexSegment(segment);
        } else {
            this.#highlightSegment(segment);
        }
    }

    #highlightSegment(segment: RulerMeasurementSegment): void {
        // Keep track of grid spaces set to be highlighed in order to skip repeated highlighting
        for (const offset of canvas.grid.getDirectPath([segment.ray.A, segment.ray.B])) {
            for (const stomp of this.#footprint) {
                const newOffset = { i: offset.i + stomp.i, j: offset.j + stomp.j };
                const packed = (newOffset.i << 16) + newOffset.j;
                if (!this.#highlighted.has(packed)) {
                    this.#highlighted.add(packed);
                    const point = canvas.grid.getTopLeftPoint(newOffset);
                    canvas.interface.grid.highlightPosition(this.name, { ...point, color: this.color });
                }
            }
        }
    }

    /** "Fat ruler" highlighting not yet supported for hexagonal grids */
    #highlightHexSegment(segment: RulerMeasurementSegment): void {
        // Keep track of grid spaces set to be highlighed in order to skip repeated highlighting
        for (const offset of canvas.grid.getDirectPath([segment.ray.A, segment.ray.B])) {
            const packed = (offset.i << 16) + offset.j;
            if (!this.#highlighted.has(packed)) {
                this.#highlighted.add(packed);
                const point = canvas.grid.getTopLeftPoint(offset);
                canvas.interface.grid.highlightPosition(this.name, { ...point, color: this.color });
            }
        }
    }

    protected override _animateSegment(
        token: TToken,
        segment: RulerMeasurementSegment,
        destination: Point,
    ): Promise<unknown> {
        if (this.dragMeasurement && this.#exactDestination && segment === this.segments.at(-1)) {
            const exactDestination = this.#exactDestination;
            this.#exactDestination = null;
            return super._animateSegment(token, segment, exactDestination);
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
