import { SpellPF2e } from '@item/spell';
import { ItemPF2e } from '../base';
import { SlotKey, SpellcastingEntryData } from './data';

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

    get isPrepared(): boolean {
        return this.data.data.prepared.value === 'prepared' && this.tradition !== 'focus';
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

    /** Saves the prepared spell slot data to the spellcasting entry  */
    prepareSpell(spell: SpellPF2e, spellLevel: number, spellSlot: number) {
        if (spell.level > spellLevel && !(spellLevel === 0 && spell.isCantrip)) {
            console.warn(`Attempted to add level ${spell.level} spell to level ${spellLevel} spell slot.`);
            return;
        }

        if (CONFIG.debug.hooks) {
            console.debug(
                `PF2e System | Updating location for spell ${spell.name} to match spellcasting entry ${this.id}`,
            );
        }

        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
        const updates: Record<string, unknown> = { [key]: { id: spell.id } };

        const slot = this.data.data.slots[`slot${spellLevel}` as SlotKey].prepared[spellSlot];
        if (slot) {
            if (slot.prepared !== undefined) {
                updates[`${key}.-=prepared`] = null;
            }
            if (slot.name !== undefined) {
                updates[`${key}.-=name`] = null;
            }
            if (slot.expended !== undefined) {
                updates[`${key}.-=expended`] = null;
            }
        }

        return this.update(updates);
    }

    /** Removes the spell slot and updates the spellcasting entry */
    unprepareSpell(spellLevel: number, spellSlot: number) {
        if (CONFIG.debug.hooks === true) {
            console.debug(
                `PF2e System | Updating spellcasting entry ${this.id} to remove spellslot ${spellSlot} for spell level ${spellLevel}`,
            );
        }

        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
        return this.update({
            [key]: {
                name: game.i18n.localize('PF2E.SpellSlotEmpty'),
                id: null,
                prepared: false,
            },
        });
    }

    /** Sets the expended state of a spell slot and updates the spellcasting entry */
    setSlotExpendedState(spellLevel: number, spellSlot: number, isExpended: boolean) {
        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}.expended`;
        return this.update({ [key]: isExpended });
    }
}

export interface SpellcastingEntryPF2e {
    readonly data: SpellcastingEntryData;
}
