import { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import { ConsumablePF2e, SpellcastingEntryPF2e } from "@item";
import { SpellcastingEntry } from "@item/spellcasting-entry/data";
import { ErrorPF2e, tupleHasValue } from "@util";

export class ActorSpellcasting extends Collection<SpellcastingEntry> {
    constructor(public readonly actor: ActorPF2e, entries?: SpellcastingEntry[]) {
        super(entries?.map((entry) => [entry.id, entry]));
    }

    /** Returns a list of entries pre-filtered to SpellcastingEntryPF2e */
    get regular() {
        return this.filter((entry): entry is SpellcastingEntryPF2e => entry instanceof SpellcastingEntryPF2e);
    }

    /**
     * All spellcasting entries that count as prepared/spontaneous, which qualify as a
     * full fledged spellcasting feature for wands and scrolls.
     */
    get spellcastingFeatures() {
        return this.regular.filter((entry) => entry.isPrepared || entry.isSpontaneous);
    }

    canCastConsumable(item: ConsumablePF2e): boolean {
        const spellData = item.data.data.spell?.data?.data;
        return (
            !!spellData &&
            this.spellcastingFeatures.some((entry) => tupleHasValue(spellData.traditions.value, entry.tradition))
        );
    }

    refocus(options: { all?: boolean } = {}) {
        if (!options.all) {
            throw ErrorPF2e("Actors do not currently support regular refocusing");
        }

        if (this.actor instanceof NPCPF2e || this.actor instanceof CharacterPF2e) {
            const focus = this.actor.data.data.resources.focus;

            const rechargeFocus = focus?.max && focus.value < focus.max;
            if (focus && rechargeFocus) {
                focus.value = focus.max;
                return { "data.resources.focus.value": focus.value };
            }
        }

        return null;
    }

    /** Recharges all spellcasting entries based on the type of entry it is */
    recharge() {
        // todo: support a timespan property of some sort and handle 1/hour innate spells
        const itemUpdates = this.contents.flatMap((entry) => {
            if (!(entry instanceof SpellcastingEntryPF2e)) return [];
            if (entry.isFocusPool) return [];

            // Innate, Spontaneous, and Prepared spells
            const slots = entry.data.data.slots;
            let updated = false;
            for (const slot of Object.values(slots)) {
                if (entry.isPrepared && !entry.isFlexible) {
                    for (const preparedSpell of Object.values(slot.prepared)) {
                        if (preparedSpell.expended) {
                            preparedSpell.expended = false;
                            updated = true;
                        }
                    }
                } else if (slot.value < slot.max) {
                    slot.value = slot.max;
                    updated = true;
                }
            }

            if (updated) {
                return { _id: entry.id, "data.slots": slots };
            }
            return [];
        });

        const actorUpdates = this.refocus({ all: true });
        return { itemUpdates, actorUpdates };
    }
}
