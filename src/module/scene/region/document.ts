import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
import type { RegionBehaviorPF2e } from "./region-behavior/document.ts";

class RegionDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null> extends RegionDocument<TParent> {}

interface RegionDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null> extends RegionDocument<TParent> {
    readonly tokens: Set<TokenDocumentPF2e>;
    readonly behaviors: foundry.abstract.EmbeddedCollection<RegionBehaviorPF2e<this>>;
}

export { RegionDocumentPF2e };
