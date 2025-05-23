import { AmbientLightDocumentPF2e } from "@scene/index.ts";
import { LightingLayerPF2e } from "./index.ts";

class AmbientLightPF2e<TDocument extends AmbientLightDocumentPF2e = AmbientLightDocumentPF2e> extends fc.placeables
    .AmbientLight<TDocument> {}

interface AmbientLightPF2e<TDocument extends AmbientLightDocumentPF2e = AmbientLightDocumentPF2e>
    extends fc.placeables.AmbientLight<TDocument> {
    get layer(): LightingLayerPF2e<this>;
}

export { AmbientLightPF2e };
