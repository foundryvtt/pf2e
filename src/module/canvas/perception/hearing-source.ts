import { TokenPF2e } from "../token/index.ts";

/** A `PointSource` to track token hearing sense */
class HearingSource<TObject extends TokenPF2e> extends PointSource<TObject> {
    static override sourceType = "sound";

    protected override _initialize(data: SoundSourceData): void {
        super._initialize(data);
        this.data.walls = true;
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
