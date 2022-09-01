import { ScenePF2e } from "@module/scene";
import { AmbientLightPF2e } from "./ambient-light";
import { LightingLayerPF2e } from "./layer/lighting";
import { MeasuredTemplatePF2e } from "./measured-template";
import { TemplateLayerPF2e } from "./layer/template";
import { TokenPF2e } from "./token";
import { TokenLayerPF2e } from "./layer/token";
import { EffectsCanvasGroupPF2e } from "./group/effects";
export * from "./helpers";

export type CanvasPF2e = Canvas<ScenePF2e, AmbientLightPF2e, MeasuredTemplatePF2e, TokenPF2e, EffectsCanvasGroupPF2e>;

export {
    AmbientLightPF2e,
    MeasuredTemplatePF2e,
    TokenPF2e,
    LightingLayerPF2e,
    TemplateLayerPF2e,
    TokenLayerPF2e,
    EffectsCanvasGroupPF2e,
};
