import { AmbientLightPF2e } from "./ambient-light";
import { TokenPF2e } from "./token";

export class LightingLayerPF2e<
    TAmbientLight extends AmbientLightPF2e = AmbientLightPF2e
> extends LightingLayer<TAmbientLight> {
    /** Temporarilly disable the refreshLighting hook */
    noRefreshHooks = false;

    get lightingLevel(): number {
        return 1 - this.darknessLevel;
    }

    setPerceivedLightLevel({ hasLowLightVision = false } = {}): void {
        if (!(canvas.scene && canvas.sight.rulesBasedVision)) return;

        const lightEmitters = [
            ...canvas.tokens.placeables.filter((token) => token.visible && token.brightRadius && token.emitsLight),
            ...canvas.lighting.placeables.filter((light) => light.visible && !light.isDarkness),
        ];
        for (const emitter of lightEmitters) {
            this.updateLight(emitter, hasLowLightVision);
        }
        canvas.perception.schedule({
            sight: { initialize: true, refresh: true, forceUpdateFog: true },
            lighting: { refresh: true },
            sounds: { refresh: true },
            foreground: { refresh: true },
        });
    }

    private updateLight(emitter: TokenPF2e | AmbientLightPF2e, hasLowLightVision: boolean): void {
        const lightConfig = emitter instanceof TokenPF2e ? emitter.data.light : emitter.data.config;
        const { bright, dim } = lightConfig;
        if (hasLowLightVision) {
            lightConfig.bright = Math.max(lightConfig.bright, lightConfig.dim);
            lightConfig.dim = 0;
        }
        emitter.updateSource({ defer: false });
        lightConfig.bright = bright;
        lightConfig.dim = dim;
    }

    /** Set the perceived brightness of sourced lighting */
    override refresh(options: { darkness?: number | null; backgroundColor?: string; noHooks?: boolean } = {}): void {
        if (canvas.sight.hasLowLightVision) {
            for (const source of this.sources) {
                if (source.isDarkness) continue;
                source.bright = Math.max(source.dim, source.bright);
                source.dim = 0;
                source.ratio = 1;
            }
        }

        // Since upstream is what calls the hook, #noRefreshHooks is intercepted in the system listener
        this.noRefreshHooks = !!options.noHooks;
        super.refresh(options);
        this.noRefreshHooks = false;
    }
}
