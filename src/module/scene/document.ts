import { SceneDataPF2e } from './data';
import { SceneConfigPF2e } from './sheet';
import { AmbientLightDocumentPF2e, LightLevels, TokenDocumentPF2e } from '.';

export class ScenePF2e extends Scene<TokenDocumentPF2e, AmbientLightDocumentPF2e> {
    /** Toggle Unrestricted Global Vision according to scene darkness level */
    override prepareBaseData() {
        super.prepareBaseData();
        if (canvas.sight?.rulesBasedVision) {
            this.data.globalLightThreshold = 1 - LightLevels.DARKNESS;
            this.data.globalLight = true;
        }

        this.data.flags.pf2e ??= { syncDarkness: 'default' };
        this.data.flags.pf2e.syncDarkness ??= 'default';
    }

    get lightLevel(): number {
        return 1 - this.data.darkness;
    }
}

export interface ScenePF2e {
    _sheet: SceneConfigPF2e | null;

    readonly data: SceneDataPF2e<this>;

    get sheet(): SceneConfigPF2e;

    getFlag(scope: 'pf2e', key: 'syncDarkness'): 'enabled' | 'disabled' | 'default';
    getFlag(scope: string, key: string): unknown;
}
