import { CharacterPF2e, CreaturePF2e } from "@actor";
import { SpellPF2e } from "@item/spell";
import { OneToTen, ZeroToTen } from "@module/data";
import { groupBy, ErrorPF2e } from "@module/utils";
import { ItemPF2e } from "../base";
import { SlotKey, SpellcastingEntryData } from "./data";

export interface SpellcastingSlotLevel {
    label: string;
    level: ZeroToTen;
    isCantrip: boolean;
    uses?: {
        value?: number;
        max: number;
    };
    displayPrepared?: boolean;
    active: (ActiveSpell | null)[];
    spellPrepList?: {
        spell: Embedded<SpellPF2e>;
        chatData: Record<string, unknown>;
    }[];
}

interface ActiveSpell {
    spell: Embedded<SpellPF2e>;
    chatData: Record<string, unknown>;
    expended?: boolean;
    signature?: boolean;
}

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
        return this.data.data.ability.value || "int";
    }

    get tradition() {
        return this.data.data.tradition.value;
    }

    /**
     * Returns the proficiency used for calculations.
     * For innate spells, this is the highest spell proficiency (min trained)
     */
    get rank() {
        const actor = this.actor;
        if (actor instanceof CharacterPF2e && this.isInnate) {
            const allRanks = actor.itemTypes.spellcastingEntry.map((entry) => entry.data.data.proficiency.value ?? 0);
            return Math.max(1, ...allRanks);
        }

        return this.data.data.proficiency.value ?? 0;
    }

    get isPrepared(): boolean {
        return this.data.data.prepared.value === "prepared";
    }

    get isSpontaneous(): boolean {
        return this.data.data.prepared.value === "spontaneous";
    }

    get isInnate(): boolean {
        return this.data.data.prepared.value === "innate";
    }

    get isFocusPool(): boolean {
        return this.data.data.prepared.value === "focus";
    }

    get isRitual(): boolean {
        return this.data.data.prepared.value === "ritual";
    }

    get highestLevel(): number {
        const highestSpell = Math.max(...this.spells.map((s) => s.heightenedLevel));
        const actorSpellLevel = Math.ceil((this.actor?.level ?? 0) / 2);
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
                `PF2e System | Updating location for spell ${spell.name} to match spellcasting entry ${this.id}`
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
                `PF2e System | Updating spellcasting entry ${this.id} to remove spellslot ${spellSlot} for spell level ${spellLevel}`
            );
        }

        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
        return this.update({
            [key]: {
                name: game.i18n.localize("PF2E.SpellSlotEmpty"),
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

    getSpellData(this: Embedded<SpellcastingEntryPF2e>) {
        if (!(this.actor instanceof CreaturePF2e)) {
            throw ErrorPF2e("Spellcasting entries can only exist on creatures");
        }

        const results: SpellcastingSlotLevel[] = [];
        const spells = this.spells.contents.sort((s1, s2) => (s1.data.sort || 0) - (s2.data.sort || 0));
        if (this.isPrepared) {
            // Prepared Spells. Active spells are what's been prepped.
            const spellsByLevel = groupBy(spells, (spell) => (spell.isCantrip ? 0 : spell.level));
            for (let level = 0; level <= this.highestLevel; level++) {
                const data = this.data.data.slots[`slot${level}` as SlotKey];

                // Populate prepared spells
                const maxPrepared = Math.max(data.max, 0);
                const active: (ActiveSpell | null)[] = Array(maxPrepared).fill(null);
                for (const [key, value] of Object.entries(data.prepared)) {
                    const spell = value.id ? this.spells.get(value.id) : null;
                    if (spell) {
                        active[Number(key)] = {
                            spell,
                            chatData: spell.getChatData(),
                            expended: value.expended,
                        };
                    }
                }

                results.push({
                    label: level === 0 ? "PF2E.TraitCantrip" : CONFIG.PF2E.spellLevels[level as OneToTen],
                    level: level as ZeroToTen,
                    uses: { max: data.max },
                    isCantrip: level === 0,
                    spellPrepList: spellsByLevel.get(level as ZeroToTen)?.map((spell) => ({
                        spell,
                        chatData: spell.getChatData(),
                    })),
                    active,
                    displayPrepared:
                        this.data.data.displayLevels && this.data.data.displayLevels[level] !== undefined
                            ? this.data.data.displayLevels[level]
                            : true,
                });
            }
        } else if (this.isFocusPool) {
            // Focus Spells. All non-cantrips are grouped together as they're auto-scaled
            const cantrips = spells.filter((spell) => spell.isCantrip);
            const leveled = spells.filter((spell) => !spell.isCantrip);

            if (cantrips.length) {
                results.push({
                    label: "PF2E.TraitCantrip",
                    level: 0,
                    isCantrip: true,
                    active: cantrips.map((spell) => ({ spell, chatData: spell.getChatData() })),
                });
            }

            if (leveled.length) {
                results.push({
                    label: "PF2E.Focus.label",
                    level: Math.max(1, Math.ceil(this.actor.level / 2)) as OneToTen,
                    isCantrip: false,
                    uses: this.actor.data.data.resources.focus ?? { value: 0, max: 0 },
                    active: leveled.map((spell) => ({ spell, chatData: spell.getChatData() })),
                });
            }
        } else {
            // Everything else
            const alwaysShowHeader = !this.isRitual;
            const spellsByLevel = groupBy(spells, (spell) => (spell.isCantrip ? 0 : spell.heightenedLevel));
            for (let level = 0; level <= this.highestLevel; level++) {
                const data = this.data.data.slots[`slot${level}` as SlotKey];
                const spells = spellsByLevel.get(level) ?? [];
                // todo: innate spells should be able to expend like prep spells do
                if (alwaysShowHeader || spells.length) {
                    const uses = this.isRitual || level === 0 ? undefined : { value: data.value, max: data.max };
                    results.push({
                        label: level === 0 ? "PF2E.TraitCantrip" : CONFIG.PF2E.spellLevels[level as OneToTen],
                        level: level as ZeroToTen,
                        isCantrip: level === 0,
                        uses,
                        active: spells.map((spell) => ({ spell, chatData: spell.getChatData() })),
                    });
                }
            }

            // Handle spontaneous signature spells
            const signatureSpells = new Set(this.data.data.signatureSpells?.value ?? []);
            for (const spellId of signatureSpells) {
                const spell = this.spells.get(spellId);
                if (!spell) continue;

                for (const level of results) {
                    if (spell.level > level.level) continue;

                    const existing = level.active.find((a) => a?.spell.id === spellId);
                    if (existing) {
                        existing.signature = true;
                    } else {
                        level.active.push({ spell, chatData: spell.getChatData(), signature: true });
                    }
                }
            }
        }

        return {
            id: this.id,
            name: this.name,
            tradition: this.tradition,
            isPrepared: this.isPrepared,
            isSpontaneous: this.isSpontaneous,
            isInnate: this.isInnate,
            isFocusPool: this.isFocusPool,
            isRitual: this.isRitual,
            levels: results,
        };
    }

    protected override async _preUpdate(
        data: DeepPartial<this["data"]["_source"]>,
        options: DocumentModificationContext,
        user: foundry.documents.BaseUser
    ) {
        // Clamp slot updates
        if (data.data?.slots) {
            for (const key of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const) {
                const slotKey = `slot${key}` as const;
                const slotData = data.data.slots[slotKey];
                if (!slotData) continue;

                if ("max" in slotData) {
                    slotData.max = Math.max(Number(slotData.max) || 0, 0);
                }
                if ("value" in slotData) {
                    const max = Number(slotData?.max) || 0;
                    slotData.value = Math.clamped(Number(slotData.value), 0, max);
                }
            }
        }

        await super._preUpdate(data, options, user);
    }
}

export interface SpellcastingEntryPF2e {
    readonly data: SpellcastingEntryData;
}
