import { SpellPF2e } from '@item/spell';
import { ItemPF2e } from '../base';
import { SpellcastingEntryData } from './data';

export class SpellcastingEntryPF2e extends ItemPF2e {
    static override get schema(): typeof SpellcastingEntryData {
        return SpellcastingEntryData;
    }

    private _spells: Collection<Embedded<SpellPF2e>> | null = null;

    /** A collection of all spells contained in this entry regardless of organization */
    get spells() {
        if (!this._spells) {
            this._spells = new Collection<Embedded<SpellPF2e>>();
            if (this.actor) {
                const spells = this.actor.itemTypes.spell.filter((i) => i.data.data.location.value === this.id);
                for (const spell of spells) {
                    this._spells.set(spell.id, spell);
                }
            }
        }

        return this._spells;
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

    get isFocusPool(): boolean {
        return this.tradition === 'focus';
    }

    get isRitual(): boolean {
        return this.tradition === 'ritual';
    }

    get highestLevel(): number {
        const highestSpell = Math.max(...this.spells.map((s) => s.heightenedLevel));
        const actorSpellLevel = Math.ceil(this.actor.level / 2);
        return Math.min(10, Math.max(highestSpell, actorSpellLevel));
    }

    override prepareData() {
        super.prepareData();

        // Wipe the internal spells collection so it can be rebuilt later.
        // We can't build the spells collection here since actor.items might not be populated
        this._spells = null;
    }
}

export interface SpellcastingEntryPF2e {
    readonly data: SpellcastingEntryData;
}
