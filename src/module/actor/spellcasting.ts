import { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import { ConsumablePF2e, SpellcastingEntryPF2e } from "@item";
import { SpellcastingEntrySource } from "@item/spellcasting-entry/index.ts";
import { SpellCollection } from "@item/spellcasting-entry/collection.ts";
import { RitualSpellcasting } from "@item/spellcasting-entry/rituals.ts";
import { BaseSpellcastingEntry } from "@item/spellcasting-entry/types.ts";
import { ErrorPF2e } from "@util";

export class ActorSpellcasting<TActor extends ActorPF2e> extends Collection<BaseSpellcastingEntry<TActor>> {
    /** All available spell lists on this actor */
    collections = new Collection<SpellCollection<TActor, BaseSpellcastingEntry<TActor>>>();

    constructor(public readonly actor: TActor, entries: BaseSpellcastingEntry<TActor>[]) {
        super(entries.map((entry) => [entry.id, entry]));

        for (const entry of entries) {
            if (entry.spells) this.collections.set(entry.spells.id, entry.spells);
        }
    }

    /** Returns a list of entries pre-filtered to SpellcastingEntryPF2e */
    get regular(): SpellcastingEntryPF2e<TActor>[] {
        return this.filter((e): e is SpellcastingEntryPF2e<TActor> => e instanceof SpellcastingEntryPF2e);
    }

    /** Get this actor's ritual casting ability */
    get ritual(): RitualSpellcasting<TActor> | null {
        const ritualCasting = this.collections.get("rituals")?.entry;
        return ritualCasting instanceof RitualSpellcasting ? ritualCasting : null;
    }

    /**
     * All spellcasting entries that count as prepared/spontaneous, which qualify as a
     * full fledged spellcasting feature for wands and scrolls.
     */
    get spellcastingFeatures(): SpellcastingEntryPF2e<TActor>[] {
        return this.regular.filter((e) => e.isPrepared || e.isSpontaneous);
    }

    canCastConsumable(item: ConsumablePF2e): boolean {
        const spell = item.embeddedSpell;
        return !!spell && this.some((e) => e.canCast(spell, { origin: item }));
    }

    refocus(options: { all?: boolean } = {}): { "system.resources.focus.value": number } | null {
        if (!options.all) {
            throw ErrorPF2e("Actors do not currently support regular refocusing");
        }

        if (this.actor instanceof NPCPF2e || this.actor instanceof CharacterPF2e) {
            const focus = this.actor.system.resources.focus;

            const rechargeFocus = focus?.max && focus.value < focus.max;
            if (focus && rechargeFocus) {
                focus.value = focus.max;
                return { "system.resources.focus.value": focus.value };
            }
        }

        return null;
    }

    /**
     * Recharges all spellcasting entries based on the type of entry it is
     * @todo Support a timespan property of some sort and handle 1/hour innate spells
     */
    recharge(): {
        itemUpdates: ((Record<string, unknown> | Partial<SpellcastingEntrySource>) & { _id: string })[];
        actorUpdates: { "system.resources.focus.value": number } | null;
    } {
        type SpellcastingUpdate =
            | EmbeddedDocumentUpdateData<SpellcastingEntryPF2e>
            | EmbeddedDocumentUpdateData<SpellcastingEntryPF2e>[];

        const itemUpdates = this.contents.flatMap((entry): SpellcastingUpdate => {
            if (!(entry instanceof SpellcastingEntryPF2e)) return [];
            if (entry.isFocusPool || !entry.spells) return [];

            // Innate spells should refresh uses instead
            if (entry.isInnate) {
                return entry.spells.map((spell) => {
                    const value = spell.system.location.uses?.max ?? 1;
                    return { _id: spell.id, "system.location.uses.value": value };
                });
            }

            // Spontaneous, and Prepared spells
            const slots = entry.system.slots;
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
                return { _id: entry.id, "system.slots": slots };
            }

            return [];
        });

        const actorUpdates = this.refocus({ all: true });
        return { itemUpdates, actorUpdates };
    }
}
