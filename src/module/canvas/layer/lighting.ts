import { AmbientLightPF2e } from "../ambient-light.ts";

export class LightingLayerPF2e<
    TAmbientLight extends AmbientLightPF2e = AmbientLightPF2e
> extends LightingLayer<TAmbientLight> {
    get lightingLevel(): number {
        return 1 - canvas.darknessLevel;
    }
}
