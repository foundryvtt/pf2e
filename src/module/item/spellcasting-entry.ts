import { ItemPF2e } from './base';
import { SpellcastingEntryData } from './data-definitions';

export class SpellcastingEntryPF2e extends ItemPF2e {
    get ability() {
        return this.data.data.ability.value || 'int';
    }

    get isSpontaneous(): boolean {
        return this.data.data.prepared.value === 'spontaneous';
    }

    get isInnate(): boolean {
        return this.data.data.prepared.value === 'innate';
    }
}

export interface SpellcastingEntryPF2e {
    data: SpellcastingEntryData;
    _data: SpellcastingEntryData;
}
