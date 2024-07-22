import type { TokenPF2e } from "../token/index.ts";

/** Subclassed to include hearing detection */
class PointVisionSourcePF2e<TObject extends TokenPF2e = TokenPF2e> extends foundry.canvas.sources
    .PointVisionSource<TObject> {
    hearing?: PointSourcePolygon;

    protected override _createShapes(): void {
        super._createShapes();

        // todo: consider wallDirectionMode: PointSourcePolygon.WALL_DIRECTION_MODES.REVERSED,
        this.hearing = CONFIG.Canvas.polygonBackends.sound.create(
            { x: this.data.x, y: this.data.y },
            {
                type: "sound",
                radius: canvas.dimensions.maxR,
                walls: true,
                source: this,
            },
        );
    }
}

export { PointVisionSourcePF2e };
