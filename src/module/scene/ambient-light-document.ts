import { AmbientLightPF2e } from '@module/canvas';
import { ScenePF2e } from '.';

export class AmbientLightDocumentPF2e extends AmbientLightDocument {
    /** Is this light actually a source of darkness? */
    get isDarkness(): boolean {
        return this.object.source.isDarkness;
    }
}

export interface AmbientLightDocumentPF2e extends AmbientLightDocument {
    readonly data: foundry.data.AmbientLightData<AmbientLightDocumentPF2e>;

    readonly parent: ScenePF2e | null;

    get object(): AmbientLightPF2e;
}
