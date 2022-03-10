import { AmbientLightPF2e } from "../ambient-light";
import { TokenPF2e } from "../token";

export class LightingLayerPF2e<
    TAmbientLight extends AmbientLightPF2e = AmbientLightPF2e
> extends LightingLayer<TAmbientLight> {
    /** Temporarilly disable the refreshLighting hook */
    noRefreshHooks = false;

    get lightingLevel(): number {
        return 1 - this.darknessLevel;
    }

    setPerceivedLightLevel({ hasLowLightVision }: { hasLowLightVision?: boolean } = {}): void {
        if (!(canvas.scene && canvas.sight.rulesBasedVision)) return;
        hasLowLightVision ??= canvas.sight.sources.some((s) => s.object.hasLowLightVision);

        const lightEmitters = [
            ...canvas.tokens.placeables.filter((token) => token.emitsLight && !token.light.isDarkness),
            ...canvas.lighting.placeables.filter((light) => light.visible && !light.isDarkness),
        ];
        for (const emitter of lightEmitters) {
            this.adjustLightRadii(emitter, hasLowLightVision);
        }
        canvas.perception.update({
            sight: { initialize: true, refresh: true, forceUpdateFog: true },
            lighting: { refresh: true },
            sounds: { refresh: true },
            foreground: { refresh: true },
        });
    }

    private adjustLightRadii(emitter: TokenPF2e | AmbientLightPF2e, hasLowLightVision: boolean): void {
        const lightConfig = emitter instanceof TokenPF2e ? emitter.data.light : emitter.data.config;
        const { bright, dim } = lightConfig;
        if (hasLowLightVision) {
            lightConfig.bright = Math.max(lightConfig.bright, lightConfig.dim);
            lightConfig.dim = 0;
            if ("brightLight" in emitter.data) {
                emitter.data.brightLight = lightConfig.bright;
                emitter.data.dimLight = lightConfig.dim;
            }
        }
        if (emitter instanceof TokenPF2e) {
            emitter.updateLightSource({ defer: true });
            emitter.data.brightLight = bright;
            emitter.data.dimLight = dim;
        } else {
            emitter.updateSource({ defer: true });
        }
        lightConfig.bright = bright;
        lightConfig.dim = dim;
    }

    /** Add a noHook option that can be intercepted by system hook listener */
    override refresh(options: { darkness?: number | null; backgroundColor?: string; noHook?: boolean } = {}): void {
        this.noRefreshHooks = !!options.noHook;
        super.refresh(options);
        this.noRefreshHooks = false;
    }
}
