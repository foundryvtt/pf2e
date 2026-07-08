import { RegionDocumentPF2e, ScenePF2e, TokenDocumentPF2e } from "@scene/index.ts";
import { EffectsCanvasGroupPF2e } from "./group/effects.ts";
import { LightingLayerPF2e } from "./layer/lighting.ts";
import { RegionLayerPF2e } from "./layer/region.ts";
import { TokenLayerPF2e } from "./layer/token.ts";
import { RegionPF2e } from "./region.ts";
import { TokenPF2e } from "./token/object.ts";

export type CanvasPF2e = foundry.canvas.Canvas<
    ScenePF2e,
    fc.placeables.AmbientLight<fd.AmbientLightDocument<ScenePF2e>>,
    TokenPF2e<TokenDocumentPF2e<ScenePF2e>>,
    EffectsCanvasGroupPF2e,
    RegionPF2e<RegionDocumentPF2e<ScenePF2e>>
>;
export * from "./helpers.ts";
export { RulerPF2e } from "./ruler.ts";
export { EffectsCanvasGroupPF2e, LightingLayerPF2e, RegionLayerPF2e, RegionPF2e, TokenLayerPF2e, TokenPF2e };
