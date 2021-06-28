import { ZeroToTwo } from '../data';
import { TokenDocumentPF2e } from '../token-document';
import { SceneConfigPF2e } from './sheet';

export class ScenePF2e extends Scene<TokenDocumentPF2e> {
    getLightLevel(): number {
        const darkness = canvas.lighting?.darknessLevel ?? this.data.darkness;
        return 1 - darkness;
    }

    override async update(data: DocumentUpdateData<this>, options?: DocumentModificationContext): Promise<this> {
        super.update(data, options);
        if (canvas.scene === this) {
            for (const token of canvas.tokens.controlled) {
                token.setPerceivedLightLevel();
            }
        }
        return this;
    }
}

export interface ScenePF2e {
    _sheet: SceneConfigPF2e;
}

export enum LightLevels {
    DARKNESS = 1 / 4,
    DIM_LIGHT = 3 / 4,
    BRIGHT_LIGHT = 1,
}

export type LightLevel = ZeroToTwo;
