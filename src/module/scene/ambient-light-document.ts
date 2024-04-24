import type { AmbientLightPF2e } from "@module/canvas/index.ts";
import type { ScenePF2e } from "./index.ts";

class AmbientLightDocumentPF2e<
    TParent extends ScenePF2e | null = ScenePF2e | null,
> extends AmbientLightDocument<TParent> {
    // Still exists if we need it later, but slated for removal once V12 is fully out
}

interface AmbientLightDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null>
    extends AmbientLightDocument<TParent> {
    get object(): AmbientLightPF2e<this> | null;
}

export { AmbientLightDocumentPF2e };
