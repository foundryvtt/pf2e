import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster.ts";
import { ScenePF2e } from "@scene";

export class LightingLayerPF2e<
    TAmbientLight extends fc.placeables.AmbientLight<fd.AmbientLightDocument<ScenePF2e>> = fc.placeables.AmbientLight<
        fd.AmbientLightDocument<ScenePF2e>
    >,
> extends fc.layers.LightingLayer<TAmbientLight> {
    get lightingLevel(): number {
        return 1 - canvas.darknessLevel;
    }

    protected override _deactivate(): void {
        super._deactivate();
        SceneDarknessAdjuster.instance.close({});
    }
}
