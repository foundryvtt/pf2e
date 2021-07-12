import { ZeroToTwo } from '../data';
export { ScenePF2e } from './document';
export { TokenDocumentPF2e } from './token-document';
export { AmbientLightDocumentPF2e } from './ambient-light-document';

export enum LightLevels {
    DARKNESS = 1 / 4,
    DIM_LIGHT = 3 / 4,
    BRIGHT_LIGHT = 1,
}

export type LightLevel = ZeroToTwo;
