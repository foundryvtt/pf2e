import { SpellPF2e } from "@item";
import { ErrorPF2e } from "@util";
import { SpellcastingEntryPF2e } from ".";
import { SlotKey } from "./data";

export class SpellCollection extends Collection<Embedded<SpellPF2e>> {
    constructor(private entry: Embedded<SpellcastingEntryPF2e>) {
        super();
    }

    get id() {
        return this.entry.id;
    }

    get actor() {
        return this.entry.actor;
    }

    /**
     * Adds a spell to this spellcasting entry, either moving it from another one if its the same actor,
     * or creating a new spell if its not.
     */
    async addSpell(spell: SpellPF2e, targetLevel?: number): Promise<SpellPF2e | null> {
        const actor = this.actor;
        if (!actor.isOfType("creature")) {
            throw ErrorPF2e("Spellcasting entries can only exist on creatures");
        }

        targetLevel ??= spell.level;
        const spellcastingEntryId = spell.system.location.value;
        if (spellcastingEntryId === this.id && spell.level === targetLevel) {
            return null;
        }

        const isStandardSpell = !(spell.isCantrip || spell.isFocusSpell || spell.isRitual);
        const heightenedUpdate =
            isStandardSpell && (this.entry.isSpontaneous || this.entry.isInnate)
                ? { "system.location.heightenedLevel": Math.max(spell.baseLevel, targetLevel) }
                : {};

        if (spell.actor === actor) {
            return spell.update({ "system.location.value": this.id, ...heightenedUpdate });
        } else {
            const source = spell.clone({ "system.location.value": this.id, ...heightenedUpdate }).toObject();
            const created = (await actor.createEmbeddedDocuments("Item", [source])).shift();

            return created instanceof SpellPF2e ? created : null;
        }
    }

    /** Saves the prepared spell slot data to the spellcasting entry  */
    async prepareSpell(spell: SpellPF2e, slotLevel: number, spellSlot: number): Promise<SpellcastingEntryPF2e> {
        if (spell.baseLevel > slotLevel && !(slotLevel === 0 && spell.isCantrip)) {
            console.warn(`Attempted to add level ${spell.baseLevel} spell to level ${slotLevel} spell slot.`);
            return this.entry;
        }

        if (CONFIG.debug.hooks) {
            console.debug(
                `PF2e System | Updating location for spell ${spell.name} to match spellcasting entry ${this.id}`
            );
        }

        const key = `system.slots.slot${slotLevel}.prepared.${spellSlot}`;
        const updates: Record<string, unknown> = { [key]: { id: spell.id } };

        const slot = this.entry.system.slots[`slot${slotLevel}` as SlotKey].prepared[spellSlot];
        if (slot) {
            if (slot.prepared !== undefined) {
                updates[`${key}.-=prepared`] = null;
            }
            if (slot.name !== undefined) {
                updates[`${key}.-=name`] = null;
            }
        }

        return this.entry.update(updates);
    }

    /** Removes the spell slot and updates the spellcasting entry */
    unprepareSpell(slotLevel: number, spellSlot: number): Promise<SpellcastingEntryPF2e> {
        if (CONFIG.debug.hooks === true) {
            console.debug(
                `PF2e System | Updating spellcasting entry ${this.id} to remove spellslot ${spellSlot} for spell level ${slotLevel}`
            );
        }

        const key = `system.slots.slot${slotLevel}.prepared.${spellSlot}`;
        return this.entry.update({
            [key]: {
                name: game.i18n.localize("PF2E.SpellSlotEmpty"),
                id: null,
                prepared: false,
                expended: false,
            },
        });
    }

    /** Sets the expended state of a spell slot and updates the spellcasting entry */
    setSlotExpendedState(slotLevel: number, spellSlot: number, isExpended: boolean): Promise<SpellcastingEntryPF2e> {
        const key = `system.slots.slot${slotLevel}.prepared.${spellSlot}.expended`;
        return this.entry.update({ [key]: isExpended });
    }
}
