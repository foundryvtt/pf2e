import { ItemPF2e } from './base';
import { SpellData } from './data-definitions';

export class SpellPF2e extends ItemPF2e {}

export interface SpellPF2e {
    data: SpellData;
    _data: SpellData;
}
