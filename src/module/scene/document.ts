import { SceneDataPF2e } from './data';
import { SceneConfigPF2e } from './sheet';
import { AmbientLightDocumentPF2e, LightLevels, TokenDocumentPF2e } from '.';

export class ScenePF2e extends Scene<TokenDocumentPF2e, AmbientLightDocumentPF2e> {
    override prepareBaseData() {
        super.prepareBaseData();
        if (canvas.sight?.rulesBasedVision) {
            this.data.globalLightThreshold = 1 - LightLevels.DARKNESS;
            this.data.globalLight = this.data.darkness < 1 - LightLevels.DARKNESS;
        }

        this.data.flags.pf2e ??= { syncDarkness: 'default' };
        this.data.flags.pf2e.syncDarkness ??= 'default';
    }

    get lightLevel(): number {
        return 1 - this.data.darkness;
    }

    override async update(data: DocumentUpdateData<this>, options?: DocumentModificationContext): Promise<this> {
        super.update(data, options);
        if (canvas.scene === this) game.user.setPerceivedLightLevel();
        return this;
    }
}

export interface ScenePF2e {
    _sheet: SceneConfigPF2e | null;

    readonly data: SceneDataPF2e<this>;

    get sheet(): SceneConfigPF2e;

    getFlag(scope: 'pf2e', key: 'syncDarkness'): 'enabled' | 'disabled' | 'default';
    getFlag(scope: string, key: string): unknown;
}
