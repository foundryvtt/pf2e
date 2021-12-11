import { ScenePF2e } from "@module/scene";
import { AmbientLightPF2e } from "./ambient-light";
import { LightingLayerPF2e } from "./lighting-layer";
import { MeasuredTemplatePF2e } from "./measured-template";
import { SightLayerPF2e } from "./sight-layer";
import { TemplateLayerPF2e } from "./template-layer";
import { TokenPF2e } from "./token";

export type CanvasPF2e = Canvas<ScenePF2e, AmbientLightPF2e, MeasuredTemplatePF2e, TokenPF2e, SightLayerPF2e>;

export { AmbientLightPF2e, MeasuredTemplatePF2e, TokenPF2e, LightingLayerPF2e, SightLayerPF2e, TemplateLayerPF2e };
