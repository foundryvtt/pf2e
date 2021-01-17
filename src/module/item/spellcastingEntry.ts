import { SpellcastingEntryData } from './dataDefinitions';

/**
 * @category Other
 */
export class SpellcastingEntry {
    data: SpellcastingEntryData;

    constructor(data) {
        this.data = data;
    }

    get ability() {
        return this.data.data.ability.value || 'int';
    }
}
