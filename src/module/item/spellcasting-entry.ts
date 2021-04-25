import { ItemPF2e } from './base';
import { SpellAttackRollModifier, SpellcastingEntryData } from './data-definitions';

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
        // todo: replace with this.data once setup is done on prepared data
        return this._data.data.attack;
    }
}

export interface SpellcastingEntryPF2e {
    data: SpellcastingEntryData;
    _data: SpellcastingEntryData;
}
