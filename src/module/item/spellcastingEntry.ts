import { SpellcastingEntryData } from './dataDefinitions';

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
}
