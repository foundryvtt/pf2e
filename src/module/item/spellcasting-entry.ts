import { SpellcastingEntryData } from './data-definitions';

/**
 * @category Other
 */
export class SpellcastingEntry {
    data: SpellcastingEntryData;

    constructor(data: SpellcastingEntryData) {
        this.data = data;
    }

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
