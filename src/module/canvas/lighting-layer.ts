import { AmbientLightPF2e } from "./ambient-light";
import type { BlurFilter } from "@pixi/filter-blur";

export class LightingLayerPF2e<
    TAmbientLight extends AmbientLightPF2e = AmbientLightPF2e
> extends LightingLayer<TAmbientLight> {
    /** A light-blending filter to apply to the coloration container */
    blendFilter!: BlurFilter;

    /** Fix bug in 0.8 core method */
    override hasGlobalIllumination(): boolean {
        if (!canvas.scene) return false;
        const { globalLight, globalLightThreshold } = canvas.scene.data;
        return globalLight && (globalLightThreshold === null || this.darknessLevel <= globalLightThreshold);
    }

    setPerceivedLightLevel({ defer = true } = {}): void {
        if (!canvas.sight.rulesBasedVision) return;

        const lightEmitters = [
            ...canvas.tokens.placeables.filter((token) => token.visible && token.emitsLight),
            ...canvas.lighting.placeables.filter((light) => light.visible && !light.isDarkness),
        ];
        for (const emitter of lightEmitters) emitter.updateSource({ defer: true });

        if (!defer) {
            canvas.perception.update({
                lighting: { refresh: true },
                sight: { initialize: true, refresh: true },
            });
        }
    }

    /** Set the perceived brightness of sourced lighting */
    override refresh(darkness?: number | null): void {
        if (canvas.sight.hasLowLightVision) {
            for (const source of this.sources) {
                if (source.isDarkness) continue;
                source.bright = Math.max(source.dim, source.bright);
                source.dim = 0;
                source.ratio = 1;
            }
        }

        super.refresh(darkness);

        if (canvas.sight.rulesBasedVision) {
            if (!this.blendFilter) {
                this.blendFilter = new PIXI.filters.BlurFilter(canvas.blurDistance * 2);
                this.blendFilter.blendMode = PIXI.BLEND_MODES.SCREEN;
            }
            for (const color of canvas.lighting.coloration?.children ?? []) {
                color.filters ??= [this.blendFilter];
            }
        }
    }

    protected override _onDarknessChange(darkness: number, prior: number): void {
        super._onDarknessChange(darkness, prior);
        canvas.darkvision.refresh({ darkness });
    }
}
