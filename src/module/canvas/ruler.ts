import type { UserPF2e } from "@module/user/document.ts";
import type { TokenPF2e } from "./token/object.ts";

class RulerPF2e<TToken extends TokenPF2e | null = TokenPF2e | null> extends Ruler<TToken, UserPF2e> {
    static override get canMeasure(): boolean {
        return (
            super.canMeasure ||
            (game.pf2e.settings.dragMeasurement &&
                canvas.tokens.controlled.length === 1 &&
                canvas.tokens.controlled[0] === canvas.tokens.hover)
        );
    }

    get isMeasuring(): boolean {
        return this.state === RulerPF2e.STATES.MEASURING;
    }

    /** Add a waypoint at the currently-drawn destination. */
    saveWaypoint(): void {
        if (!game.pf2e.settings.dragMeasurement) return;

        const point = this.destination;
        if (point) {
            const snap = !game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT);
            this._addWaypoint(point, { snap });
        }
    }

    protected override _onMouseUp(event: PlaceablesLayerPointerEvent<NonNullable<TToken>>): void {
        if (!game.pf2e.settings.dragMeasurement) return super._onMouseUp(event);

        if (!this.isMeasuring || event.ctrlKey) {
            return super._onMouseUp(event);
        } else if (event.button === 2) {
            // Right mouse up: handled by `onRightClickWithLeftDown`
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

    /**
     * PIXI has a bug where it can't detect a right-click while the left mouse button is held down.
     * This method is instead called from a native event listener. */
    onRightClickWithLeftDown(): void {
        if (!game.pf2e.settings.dragMeasurement || !this.isMeasuring) return;

        if (this.waypoints.length > 1) {
            canvas.mouseInteractionManager._dragRight = false;
            return this._removeWaypoint();
        } else {
            return this._endMeasurement();
        }
    }

    /** If measuring with a token, only broadcast during an encounter. */
    protected override _broadcastMeasurement(): void {
        if (!game.pf2e.settings.dragMeasurement || game.activeTool === "ruler" || game.combat?.started) {
            return super._broadcastMeasurement();
        }
    }
}

export { RulerPF2e };
