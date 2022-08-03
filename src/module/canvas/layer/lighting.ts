import { AmbientLightPF2e } from "../ambient-light";

export class LightingLayerPF2e<
    TAmbientLight extends AmbientLightPF2e = AmbientLightPF2e
> extends LightingLayer<TAmbientLight> {
    /** Temporarilly disable the refreshLighting hook */
    noRefreshHooks = false;

    get lightingLevel(): number {
        return 1 - canvas.darknessLevel;
    }

    /** Is the rules-based vision setting enabled? */
    get rulesBasedVision(): boolean {
        // const settingEnabled = game.settings.get("pf2e", "automation.rulesBasedVision");
        // return canvas.ready && !!canvas.scene?.tokenVision && settingEnabled;
        return false;
    }

    get hasLowLightVision(): boolean {
        return this.rulesBasedVision && canvas.effects.visionSources.some((source) => source.object.hasLowLightVision);
    }

    get hasDarkvision(): boolean {
        return this.rulesBasedVision && canvas.effects.visionSources.some((source) => source.object.hasDarkvision);
    }

    /** Add a noHook option that can be intercepted by system hook listener */
    override refresh(options: { darkness?: number | null; backgroundColor?: string; noHook?: boolean } = {}): void {
        this.noRefreshHooks = !!options.noHook;
        super.refresh(options);
        this.noRefreshHooks = false;
    }
}
