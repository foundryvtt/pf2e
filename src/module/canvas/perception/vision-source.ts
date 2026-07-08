import { TokenPF2e } from "../token/index.ts";

export class PointVisionSourcePF2e extends fc.sources.PointVisionSource<TokenPF2e> {
    protected override _initialize(data: Partial<fc.sources.VisionSourceData>): void {
        super._initialize(data);
        if (data.visionMode === "darkvision") this.data.priority = 1;
    }
}
