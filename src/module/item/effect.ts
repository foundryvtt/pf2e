import { ItemPF2e } from './base';
import { EffectData } from './data-definitions';

export class EffectPF2e extends ItemPF2e {}

export interface EffectPF2e {
    data: EffectData;
    _data: EffectData;
}
