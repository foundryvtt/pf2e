import { AmbientLightPF2e } from "@module/canvas";
import { ScenePF2e } from ".";

class AmbientLightDocumentPF2e extends AmbientLightDocument {
    /** Is this light actually a source of darkness? */
    get isDarkness(): boolean {
        return this.object.source.isDarkness;
    }
}

interface AmbientLightDocumentPF2e extends AmbientLightDocument {
    readonly parent: ScenePF2e | null;

    get object(): AmbientLightPF2e;
}

export { AmbientLightDocumentPF2e };
