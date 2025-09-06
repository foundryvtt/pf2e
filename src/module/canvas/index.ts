import {
    AmbientLightDocumentPF2e,
    MeasuredTemplateDocumentPF2e,
    RegionDocumentPF2e,
    ScenePF2e,
    TokenDocumentPF2e,
} from "@scene/index.ts";
import { AmbientLightPF2e } from "./ambient-light.ts";
import { EffectsCanvasGroupPF2e } from "./group/effects.ts";
import { LightingLayerPF2e } from "./layer/lighting.ts";
import { TemplateLayerPF2e } from "./layer/template.ts";
import { TokenLayerPF2e } from "./layer/token.ts";
import { MeasuredTemplatePF2e } from "./measured-template.ts";
import { RegionPF2e } from "./region.ts";
import { TokenPF2e } from "./token/object.ts";

export type CanvasPF2e = foundry.canvas.Canvas<
    ScenePF2e,
    AmbientLightPF2e<AmbientLightDocumentPF2e<ScenePF2e>>,
    MeasuredTemplatePF2e<MeasuredTemplateDocumentPF2e<ScenePF2e>>,
    TokenPF2e<TokenDocumentPF2e<ScenePF2e>>,
    EffectsCanvasGroupPF2e,
    RegionPF2e<RegionDocumentPF2e<ScenePF2e>>
>;

export * from "./helpers.ts";
export { RulerPF2e } from "./ruler.ts";
export {
    AmbientLightPF2e,
    EffectsCanvasGroupPF2e,
    LightingLayerPF2e,
    MeasuredTemplatePF2e,
    RegionPF2e,
    TemplateLayerPF2e,
    TokenLayerPF2e,
    TokenPF2e,
};
