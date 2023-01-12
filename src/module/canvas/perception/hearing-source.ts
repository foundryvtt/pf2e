import { TokenPF2e } from "../token";

/** A `PointSource` to track token hearing sense */
class HearingSource<TObject extends TokenPF2e> extends PointSource<TObject> {
    static override sourceType = "sound";

    initialize(): this {
        this.data = {
            x: this.object.center.x,
            y: this.object.center.y,
            z: this.object.document.elevation,
            radius: canvas.dimensions?.maxR ?? 0,
            walls: true,
        };
        this.radius = this.data.radius;
        this.los = this._createPolygon();

        return this;
    }

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig {
        return {
            type: "sound",
            radius: this.radius,
            density: (
                PIXI.Circle as typeof PIXI.Circle & { approximateVertexDensity(radius: number): number }
            ).approximateVertexDensity(this.data.radius),
            source: this,
        };
    }
}

interface HearingSource<TObject extends TokenPF2e> extends PointSource<TObject> {
    data: Required<SoundSourceData>;
}

export { HearingSource };
