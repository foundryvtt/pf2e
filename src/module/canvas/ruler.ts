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
        const controlledToken = canvas.tokens.controlled[0];
        return (
            super.canMeasure ||
            (this.#dragMeasurement &&
                canvas.tokens.controlled.length === 1 &&
                (controlledToken.hover || controlledToken.dragMeasureTarget))
        );
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

    protected override _onClickLeft(event: PlaceablesLayerPointerEvent<NonNullable<TToken>>): void {
        if (this.dragMeasurement) event.ctrlKey = false;
        return super._onClickLeft(event);
    }

    protected override _onMouseUp(event: PlaceablesLayerPointerEvent<NonNullable<TToken>>): void {
        if (!this.dragMeasurement) return super._onMouseUp(event);

        event.ctrlKey = false;

        if (this.token) this.token.dragMeasureTarget = false;

        if (!this.isMeasuring) {
            return super._onMouseUp(event);
        } else if (event.button === 2) {
            // Right mouse up: handled by `onDragLeftCancel`
            return;
        } else if (this.waypoints.length >= 1) {
            if (this.token) {
                this.token.document.locked = this.token.document._source.locked;
            }

            if (game.activeTool !== "ruler" && canvas.tokens.controlled.length > 0) {
                this.moveToken();
            }
            return this._endMeasurement();
        }

        event.ctrlKey = false;
        return this._onClickLeft(event);
    }

    protected override _onDragStart(event: PlaceablesLayerPointerEvent<NonNullable<TToken>>): void {
        super._onDragStart(event);
        if (this.token) this.token.dragMeasureTarget = false;
    }

    /**
     * The `MouseInteractionManager` prevents drag cancellation when the ruler is active: use a workaround from a DOM
     * listener.
     */
    onDragLeftCancel(event: MouseEvent): void {
        if (!this.dragMeasurement || !this.isMeasuring || event.buttons !== 3) {
            return;
        }

        if (this.waypoints.length > 1) {
            canvas.mouseInteractionManager._dragRight = false;
            return this._removeWaypoint();
        } else {
            return this._endMeasurement();
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
