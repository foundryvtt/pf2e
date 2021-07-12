import { FogExplorationPF2e } from '@module/fog-exploration';
import { TokenPF2e } from './token';

export class SightLayerPF2e extends SightLayer<TokenPF2e, FogExplorationPF2e> {
    /** Is the rules-based vision setting enabled? */
    get rulesBasedVision(): boolean {
        const settingEnabled = game.settings.get('pf2e', 'automation.rulesBasedVision');
        return canvas.ready && !!canvas.scene && this.tokenVision && settingEnabled;
    }

    /** Re-prepare scene data prior to this layer's initialization */
    override async initialize(): Promise<void> {
        canvas.scene?.prepareData();
        await super.initialize();
    }
}
