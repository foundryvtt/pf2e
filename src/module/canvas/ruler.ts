import type { UserPF2e } from "@module/user/document.ts";
import type { TokenPF2e } from "./token/object.ts";

class RulerPF2e<TToken extends TokenPF2e | null = TokenPF2e | null> extends Ruler<TToken, UserPF2e> {
    /** Whether drag measurement is enabled */
    static get #dragMeasurement(): boolean {
        return game.pf2e.settings.dragMeasurement;
    }

    get dragMeasurement(): boolean {
        return RulerPF2e.#dragMeasurement;
    }

    static override get canMeasure(): boolean {
        return this.#dragMeasurement ? game.activeTool === "ruler" : super.canMeasure;
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
        if (!this.dragMeasurement || game.activeTool === "ruler") return;
        const { origin, object } = event.interactionData;
        object.document.locked = true;
        return this._startMeasurement(origin, { snap: !event.shiftKey, token: object });
    }

    onDragMeasureMove(event: TokenPointerEvent<NonNullable<TToken>>): void {
        if (!this.dragMeasurement) return;
        return this._onMouseMove(event);
    }

    async finishDragMeasurement(): Promise<boolean | void> {
        if (!this.dragMeasurement) return;
        if (this.token) {
            this.token.document.locked = this.token.document._source.locked;
            if (!this.isMeasuring) canvas.mouseInteractionManager.cancel();
            return this.moveToken();
        }

        return this._endMeasurement();
    }

    /** Prevent inclusion of a token when using the ruler tool. */
    protected override _startMeasurement(origin: Point, options: { snap?: boolean; token?: TToken | null } = {}): void {
        if (game.activeTool === "ruler") options.token = null;
        return super._startMeasurement(origin, options);
    }

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
        if (this.dragMeasurement) return;
        return super._onMoveKeyDown(context);
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

    /** If measuring with a token, only broadcast during an encounter. */
    protected override _broadcastMeasurement(): void {
        if (!this.dragMeasurement || game.activeTool === "ruler" || game.combat?.started) {
            return super._broadcastMeasurement();
        }
    }
}

export { RulerPF2e };
