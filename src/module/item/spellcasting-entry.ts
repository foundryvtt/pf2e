import { ItemPF2e } from './base';
import { SpellAttackRollModifier, SpellcastingEntryData, SpellDifficultyClass } from './data-definitions';

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

    get attack(): SpellAttackRollModifier | undefined {
        // Once all actors swap to prepared data, this._data can be removed
        return this.data.data.attack ?? this._data.data.attack;
    }

    get dc(): SpellDifficultyClass | undefined {
        // Once all actors swap to prepared data, this._data can be removed
        return this.data.data.dc ?? this._data.data.dc;
    }
}

export interface SpellcastingEntryPF2e {
    data: SpellcastingEntryData;
    _data: SpellcastingEntryData;
}
