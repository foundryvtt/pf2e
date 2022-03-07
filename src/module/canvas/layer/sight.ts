import { FogExplorationPF2e } from "@module/fog-exploration";
import { TokenPF2e } from "../token";

export class SightLayerPF2e extends SightLayer<TokenPF2e, FogExplorationPF2e> {
    /** Is the rules-based vision setting enabled? */
    get rulesBasedVision(): boolean {
        const settingEnabled = game.settings.get("pf2e", "automation.rulesBasedVision");
        return canvas.ready && !!canvas.scene && this.tokenVision && settingEnabled;
    }

    get hasLowLightVision(): boolean {
        return this.rulesBasedVision && this.sources.some((source) => source.object.hasLowLightVision);
    }

    get hasDarkvision(): boolean {
        return this.rulesBasedVision && this.sources.some((source) => source.object.hasDarkvision);
    }
}
