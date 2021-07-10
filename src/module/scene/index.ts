import { ZeroToTwo } from '../data';
import { TokenDocumentPF2e } from '../token-document';
import { AmbientLightDocumentPF2e } from './ambient-light-document';
import { SceneDataPF2e } from './data';
import { SceneConfigPF2e } from './sheet';

class ScenePF2e extends Scene<TokenDocumentPF2e, AmbientLightDocumentPF2e> {
    override prepareBaseData() {
        super.prepareBaseData();
        if (canvas.sight?.rulesBasedVision) {
            this.data.globalLightThreshold = 1 - LightLevels.DARKNESS;
            this.data.globalLight = this.data.darkness < 1 - LightLevels.DARKNESS;
        }

        this.data.flags.pf2e ??= { syncDarkness: 'default' };
        this.data.flags.pf2e.syncDarkness ??= 'default';
    }

    getLightLevel(): number {
        const darkness = canvas.lighting?.darknessLevel ?? this.data.darkness;
        return 1 - darkness;
    }

    override async update(data: DocumentUpdateData<this>, options?: DocumentModificationContext): Promise<this> {
        super.update(data, options);
        if (canvas.scene === this) game.user.setPerceivedLightLevel();
        return this;
    }
}

interface ScenePF2e {
    _sheet: SceneConfigPF2e | null;

    readonly data: SceneDataPF2e<this>;

    get sheet(): SceneConfigPF2e;

    getFlag(scope: 'pf2e', key: 'syncDarkness'): 'enabled' | 'disabled' | 'default';
    getFlag(scope: string, key: string): unknown;
}

enum LightLevels {
    DARKNESS = 1 / 4,
    DIM_LIGHT = 3 / 4,
    BRIGHT_LIGHT = 1,
}

type LightLevel = ZeroToTwo;

export { AmbientLightDocumentPF2e, LightLevel, LightLevels, ScenePF2e, TokenDocumentPF2e };
