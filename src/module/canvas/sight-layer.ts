import { FogExplorationPF2e } from '@module/fog-exploration';

export class SightLayerPF2e extends SightLayer<FogExplorationPF2e> {
    /** Is the rules-based vision setting enabled? */
    get rulesBasedVision(): boolean {
        const settingEnabled = game.settings.get('pf2e', 'automation.rulesBasedVision');
        return canvas.ready && !!canvas.scene && this.tokenVision && settingEnabled;
    }
}
