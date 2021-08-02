import { AmbientLightPF2e } from "./ambient-light";

export class LightingLayerPF2e<
    TAmbientLight extends AmbientLightPF2e = AmbientLightPF2e
> extends LightingLayer<TAmbientLight> {
    setPerceivedLightLevel({ defer = true } = {}): void {
        if (!canvas.sight.rulesBasedVision) return;

        const lightEmitters = [
            ...canvas.tokens.placeables.filter((token) => token.visible && token.emitsLight),
            ...canvas.lighting.placeables.filter((light) => light.visible && !light.isDarkness),
        ];
        for (const emitter of lightEmitters) emitter.updateSource({ defer: true });

        if (!defer) {
            canvas.perception.schedule({
                lighting: { refresh: true },
                sight: { initialize: true, refresh: true },
            });
        }
    }

    /** Set the perceived brightness of sourced lighting */
    override refresh(darkness?: number | null): void {
        if (canvas.sight.hasLowLightVision) {
            for (const source of this.sources) {
                if (source.isDarkness || !source.active) continue;
                source.bright = Math.max(source.dim, source.bright);
                source.dim = 0;
                source.ratio = 1;
            }
        }

        super.refresh(darkness);
    }

    protected override _onDarknessChange(darkness: number, prior: number): void {
        super._onDarknessChange(darkness, prior);
        canvas.darkvision.refresh({ darkness });
    }
}
