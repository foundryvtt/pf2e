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

    /**
     * Fix bug present as of V9.254 in which the LOS mask isn't applied to the lighting layer's coloration container
     * https://gitlab.com/foundrynet/foundryvtt/-/issues/6797
     */
    override restrictVisibility(): void {
        const lightLayer = canvas.lighting;
        if (!(lightLayer.illumination && lightLayer.coloration && lightLayer.background)) {
            return;
        }

        // Light Sources
        const lightMask = this.visible ? this.losCache.sprite : null;
        lightLayer.illumination.primary.mask = lightLayer.coloration.mask = lightLayer.background.mask = lightMask;

        // Tokens
        for (const token of canvas.tokens.placeables) {
            token.visible = (!this.tokenVision && !token.data.hidden) || token.isVisible;
        }

        // Door Icons
        for (const door of canvas.controls.doors.children) {
            door.visible = !this.tokenVision || door.isVisible;
        }

        // Map Notes
        for (const note of canvas.notes.placeables) {
            note.visible = note.isVisible;
        }

        /**
         * A hook event that fires when the SightLayer has been refreshed.
         * @function sightRefresh
         * @memberof hookEvents
         * @param sight The SightLayer
         */
        Hooks.callAll("sightRefresh", this);
    }
}
