import type { ClockwiseSweepPolygon } from "@client/canvas/geometry/_module.d.mts";
import type { TokenPF2e } from "../token/index.ts";

/** Subclassed to include hearing detection */
class PointVisionSourcePF2e<TObject extends TokenPF2e = TokenPF2e> extends foundry.canvas.sources
    .PointVisionSource<TObject> {
    hearing?: ClockwiseSweepPolygon;

    protected override _createShapes(): void {
        super._createShapes();

        // todo: consider wallDirectionMode: PointSourcePolygon.WALL_DIRECTION_MODES.REVERSED,
        this.hearing = CONFIG.Canvas.polygonBackends.sound.create(
            { x: this.data.x, y: this.data.y },
            {
                type: "sound",
                radius: canvas.dimensions.maxR,
                wallDirectionMode: fc.geometry.PointSourcePolygon.WALL_DIRECTION_MODES.NORMAL,
                source: this,
            },
        );
    }
}

export { PointVisionSourcePF2e };
