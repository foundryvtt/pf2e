import { AmbientLightPF2e } from './ambient-light';

export class LightingLayerPF2e extends LightingLayer<AmbientLightPF2e> {
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
        if (canvas.tokens.controlled.some((token) => token.hasLowLightVision)) {
            for (const source of this.sources) {
                if (source.isDarkness || !source.active) continue;
                source.bright = Math.max(source.dim, source.bright);
                source.dim = 0;
                source.ratio = 1;
            }
        }

        this.darknessLevel = Math.min(this.darknessLevel, 0.925);
        super.refresh(darkness);
    }
}
