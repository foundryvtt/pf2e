import { AmbientLightDocumentPF2e } from "@scene/index.ts";
import { LightingLayerPF2e } from "./index.ts";

class AmbientLightPF2e<
    TDocument extends AmbientLightDocumentPF2e = AmbientLightDocumentPF2e,
> extends AmbientLight<TDocument> {
    /** Is this light actually a source of darkness? */
    get isDarkness(): boolean {
        return this.source.isDarkness;
    }
}

interface AmbientLightPF2e<TDocument extends AmbientLightDocumentPF2e = AmbientLightDocumentPF2e>
    extends AmbientLight<TDocument> {
    get layer(): LightingLayerPF2e<this>;
}

export { AmbientLightPF2e };
