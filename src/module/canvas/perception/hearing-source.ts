import { TokenPF2e } from "../token/index.ts";

/** A `PointSource` to track token hearing sense */
class HearingSource<TObject extends TokenPF2e> extends SoundSource<TObject> {
    protected override _initialize(data: PointSourceData): void {
        super._initialize(data);
        this.data.x = this.object.center.x;
        this.data.y = this.object.center.y;
        this.data.elevation = this.object.document.elevation;
        this.data.radius = 1000;
        this.data.walls = true;
    }
}

export { HearingSource };
