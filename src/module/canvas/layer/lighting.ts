import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster.ts";
import { AmbientLightPF2e } from "../ambient-light.ts";

export class LightingLayerPF2e<TAmbientLight extends AmbientLightPF2e = AmbientLightPF2e> extends fc.layers
    .LightingLayer<TAmbientLight> {
    get lightingLevel(): number {
        return 1 - canvas.darknessLevel;
    }

    protected override _deactivate(): void {
        super._deactivate();
        SceneDarknessAdjuster.instance.close({});
    }
}
