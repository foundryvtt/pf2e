import { ItemPF2e } from './base';
import { SpellcastingEntryData } from './data/types';

export class SpellcastingEntryPF2e extends ItemPF2e {
    get ability() {
        return this.data.data.ability.value || 'int';
    }

    get tradition() {
        return this.data.data.tradition.value;
    }

    get isSpontaneous(): boolean {
        return this.data.data.prepared.value === 'spontaneous' && this.tradition !== 'focus';
    }

    get isInnate(): boolean {
        return this.data.data.prepared.value === 'innate';
    }
}

export interface SpellcastingEntryPF2e {
    data: SpellcastingEntryData;
}
