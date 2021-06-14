import { ItemPF2e } from '../base';
import { SpellcastingEntryData } from './data';

export class SpellcastingEntryPF2e extends ItemPF2e {
    static override get schema(): typeof SpellcastingEntryData {
        return SpellcastingEntryData;
    }

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
    readonly data: SpellcastingEntryData;
}
