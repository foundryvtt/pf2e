import { ItemPF2e } from './item';
import { EffectData } from './data-definitions';

export class EffectPF2e extends ItemPF2e {
    data!: EffectData;
    _data!: EffectData;
}
