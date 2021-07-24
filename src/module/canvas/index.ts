import { ScenePF2e } from '@module/scene';
import { AmbientLightPF2e } from './ambient-light';
import { LightingLayerPF2e } from './lighting-layer';
import { SightLayerPF2e } from './sight-layer';
import { TokenPF2e } from './token';

export type CanvasPF2e = Canvas<ScenePF2e, AmbientLightPF2e, TokenPF2e, SightLayerPF2e>;

export { AmbientLightPF2e, TokenPF2e, LightingLayerPF2e, SightLayerPF2e };
