import { AmbientLightDocumentPF2e } from "@scene/index.ts";
import { LightingLayerPF2e } from "./index.ts";

class AmbientLightPF2e<
    TDocument extends AmbientLightDocumentPF2e = AmbientLightDocumentPF2e,
> extends AmbientLight<TDocument> {
    // Still exists if we need it later, but slated for removal once V12 is fully out
}

interface AmbientLightPF2e<TDocument extends AmbientLightDocumentPF2e = AmbientLightDocumentPF2e>
    extends AmbientLight<TDocument> {
    get layer(): LightingLayerPF2e<this>;
}

export { AmbientLightPF2e };
