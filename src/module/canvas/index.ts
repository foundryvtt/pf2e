import { ScenePF2e } from '@module/scene';
import { LightingLayerPF2e } from './lighting-layer';
import { TokenPF2e } from './token';

export type CanvasPF2e = Canvas<ScenePF2e, TokenPF2e, LightingLayerPF2e>;

export { TokenPF2e, LightingLayerPF2e };
