import { TokenAuraColors } from "./token/aura/index.ts";

/** A square (`PIXI.Rectangle`) with additional information about an effect area it's part of */
export class EffectAreaSquare extends PIXI.Rectangle {
    /** Whether this square is an active part of the aura or blocked (typically by a wall) */
    active: boolean;

    constructor(x: number, y: number, width: number, height: number, active = true) {
        super(x, y, width, height);
        this.active = active;
    }

    get center(): Point {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
        };
    }

    highlight(layer: GridHighlight, colors: TokenAuraColors): void {
        // Don't bother highlighting if outside the map boundaries
        if (this.x < 0 || this.y < 0) return;

        if (this.active) {
            canvas.grid.grid.highlightGridPosition(layer, {
                x: this.x,
                y: this.y,
                border: colors.border,
                color: colors.fill,
            });
        } else {
            canvas.grid.grid.highlightGridPosition(layer, {
                x: this.x,
                y: this.y,
                border: 0x000001,
                color: 0x000000,
            });
            layer
                .beginFill(0x000000, 0.5)
                .moveTo(this.x, this.y)
                .lineTo(this.x + this.width, this.y + this.height)
                .endFill();
        }
    }
}
