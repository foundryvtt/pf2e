import { ItemSpellcasting, PhysicalItemPF2e } from "@item/physical";
import { SpellPF2e } from "@item/spell";
import { SpellcastingEntryPF2e } from "@item/spellcasting-entry";
import { groupBy, tupleHasValue } from "@module/utils";

export class StaffSpellcasting<T extends PhysicalItemPF2e> implements ItemSpellcasting<T> {
    spells = new Collection<SpellPF2e>();

    get actor() {
        return this.item.actor;
    }

    constructor(public item: T) {
        this.spells.clear();
        const spellcastingData = this.item.data.data.spellcasting;
        if (spellcastingData) {
            for (const spellData of Object.values(spellcastingData?.spells) ?? []) {
                const { data } = spellData;
                const spell = new SpellPF2e(data, { parent: this.actor });
                spell.container = this.item;
                this.spells.set(spell.id, spell);
            }
        } else {
            this.item.data.data.spellcasting = {
                type: "staff",
                charges: { value: 0, max: 0 },
                spells: {},
            };
        }
    }

    get charges() {
        return this.item.data.data.spellcasting?.charges ?? { value: 0, max: 0 };
    }

    async addSpell(spell: SpellPF2e) {
        const data = spell.data.toObject(true);
        if (!data.data.heightenedLevel?.value) {
            data.data.heightenedLevel = { value: spell.level };
        }
        await this.item.update({ [`data.spellcasting.spells.${spell.id}`]: { data } });
    }

    async removeSpell(spellId: string) {
        await this.item.update({ [`data.spellcasting.spells.-=${spellId}`]: null });
    }

    /**
     * Returns the best possible spellcasting entry to cast the spell
     */
    private getBestSpellcastingEntry(spell: SpellPF2e): SpellcastingEntryPF2e | undefined {
        // If there"s no proficiency set, set one up
        if (this.actor && !spell.data.data.location.value) {
            const spellcastingEntries = this.actor.itemTypes.spellcastingEntry
                .filter((i) => ["prepared", "spontaneous"].includes(i.data.data.prepared.value))
                .filter((i) => tupleHasValue(spell.data.data.traditions.value, i.data.data.tradition.value));

            let maxEntry: SpellcastingEntryPF2e = spellcastingEntries[0];
            for (const entry of spellcastingEntries) {
                if (entry.data.data.spelldc?.value > maxEntry.data.data.spelldc?.value) {
                    maxEntry = entry;
                }
            }

            return maxEntry;
        }

        return undefined;
    }

    // Retrieves a spell, but assigns the best proficiency
    private resolveSpell(spellId: string): SpellPF2e | null {
        if (!this.actor) throw new Error("Attempted spellcasting without an actor!");
        const internalSpell = this.spells.get(spellId);
        if (!internalSpell) return null;
        const entry = this.getBestSpellcastingEntry(internalSpell);
        internalSpell.data.data.location.value = entry?.id ?? "";
        return internalSpell;
    }

    async cast(spellId: string, { consume = true }) {
        const resolved = this.resolveSpell(spellId);
        if (consume && resolved) {
            const level = resolved.heightenedLevel;
            const remaining = this.charges.value;
            if (level > remaining) {
                const message = game.i18n.format("PF2E.Item.Staff.ChargesError", { spell: this.item.name });
                ui.notifications.error(message);
                return;
            }

            this.item.update({ "data.data.spellcasting.charges.value": remaining - level });
        }

        resolved?.toMessage();
    }

    getSpellData() {
        const spells = this.spells.contents.sort((s1, s2) => (s1.data.sort || 0) - (s2.data.sort || 0));
        const spellsByLevel = groupBy(spells, (spell) => (spell.isCantrip ? 0 : spell.heightenedLevel));
    }
}
