import { ActorPF2e } from "@actor";
import { ItemPF2e, SpellPF2e, SpellcastingEntryPF2e } from "@item";
import { OneToTen, ValueAndMax, ZeroToTen } from "@module/data.ts";
import { ErrorPF2e, groupBy, ordinal } from "@util";
import { SlotKey } from "./data.ts";
import { RitualSpellcasting } from "./rituals.ts";
import { ActiveSpell, BaseSpellcastingEntry, SpellcastingSlotLevel, SpellPrepEntry } from "./types.ts";

class SpellCollection<TActor extends ActorPF2e, TEntry extends BaseSpellcastingEntry<TActor | null>> extends Collection<
    SpellPF2e<TActor>
> {
    readonly entry: TEntry;

    readonly actor: TActor;

    constructor(entry: TEntry) {
        if (!entry.actor) throw ErrorPF2e("a spell collection must have an associated actor");
        super();

        this.entry = entry;
        this.actor = entry.actor;
    }

    get id(): string {
        return this.entry.id;
    }

    get highestLevel(): number {
        const highestSpell = Math.max(...this.map((s) => s.level));
        const actorSpellLevel = Math.ceil((this.actor?.level ?? 0) / 2);
        return Math.min(10, Math.max(highestSpell, actorSpellLevel));
    }

    #assertEntryIsDocument(
        entry: BaseSpellcastingEntry<TActor | null>
    ): asserts entry is SpellcastingEntryPF2e<TActor> {
        if (!(entry instanceof ItemPF2e)) {
            throw ErrorPF2e("`this#entry` is not a `SpellcastingEntryPF2e`");
        }
    }

    /**
     * Adds a spell to this spellcasting entry, either moving it from another one if its the same actor,
     * or creating a new spell if its not. If given a level, it will heighten to that level if it can be.
     */
    async addSpell(spell: SpellPF2e, options: { slotLevel?: number } = {}): Promise<SpellPF2e<TActor> | null> {
        const { actor } = this;
        if (!actor.isOfType("creature")) {
            throw ErrorPF2e("Spellcasting entries can only exist on creatures");
        }

        const isStandardSpell = !(spell.isCantrip || spell.isFocusSpell || spell.isRitual);
        const canHeighten = isStandardSpell && (this.entry.isSpontaneous || this.entry.isInnate);

        // Only allow a different slot level if the spell can heighten
        const heightenLevel = canHeighten ? options.slotLevel ?? spell.level : spell.baseLevel;

        const spellcastingEntryId = spell.system.location.value;
        if (spellcastingEntryId === this.id && spell.level === heightenLevel) {
            return null;
        }

        // Don't allow focus spells in non-focus casting entries
        if (spell.isFocusSpell && !this.entry.isFocusPool) {
            const focusTypeLabel = game.i18n.format("PF2E.SpellFocusLabel");
            ui.notifications.warn(
                game.i18n.format("PF2E.Item.Spell.Warning.WrongSpellType", {
                    spellType: focusTypeLabel,
                })
            );
            return null;
        }

        // Warn if the level being dragged to is lower than spell's level
        if (spell.baseLevel > heightenLevel && this.id === spell.system.location?.value) {
            const targetLevelLabel = game.i18n.format("PF2E.SpellLevel", { level: ordinal(heightenLevel) });
            const baseLabel = game.i18n.format("PF2E.SpellLevel", { level: ordinal(spell.baseLevel) });
            ui.notifications.warn(
                game.i18n.format("PF2E.Item.Spell.Warning.InvalidLevel", {
                    name: spell.name,
                    targetLevel: targetLevelLabel,
                    baseLevel: baseLabel,
                })
            );
        }

        const heightenedUpdate =
            canHeighten && heightenLevel >= spell.baseLevel ? { "system.location.heightenedLevel": heightenLevel } : {};

        if (spell.actor === actor) {
            return spell.update({
                "system.location.value": this.id,
                ...heightenedUpdate,
            }) as Promise<SpellPF2e<TActor> | null>;
        } else {
            const source = spell.clone({ "system.location.value": this.id, ...heightenedUpdate }).toObject();
            const created = (await actor.createEmbeddedDocuments("Item", [source])).shift();

            return created instanceof SpellPF2e ? created : null;
        }
    }

    /** Saves the prepared spell slot data to the spellcasting entry  */
    async prepareSpell(spell: SpellPF2e, slotLevel: number, spellSlot: number): Promise<TEntry> {
        this.#assertEntryIsDocument(this.entry);

        if (spell.baseLevel > slotLevel && !(slotLevel === 0 && spell.isCantrip)) {
            const targetLevelLabel = game.i18n.format("PF2E.SpellLevel", { level: ordinal(slotLevel) });
            const baseLabel = game.i18n.format("PF2E.SpellLevel", { level: ordinal(spell.baseLevel) });
            ui.notifications.warn(
                game.i18n.format("PF2E.Item.Spell.Warning.InvalidLevel", {
                    name: spell.name,
                    targetLevel: targetLevelLabel,
                    baseLevel: baseLabel,
                })
            );

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
    unprepareSpell(slotLevel: number, spellSlot: number): Promise<TEntry> {
        this.#assertEntryIsDocument(this.entry);

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
    setSlotExpendedState(slotLevel: number, spellSlot: number, isExpended: boolean): Promise<TEntry> {
        this.#assertEntryIsDocument(this.entry);

        const key = `system.slots.slot${slotLevel}.prepared.${spellSlot}.expended`;
        return this.entry.update({ [key]: isExpended });
    }

    async getSpellData(): Promise<SpellCollectionData> {
        const { actor } = this;
        if (!actor.isOfType("character", "npc")) {
            throw ErrorPF2e("Spellcasting entries can only exist on characters and npcs");
        }

        if (this.entry instanceof RitualSpellcasting) {
            return this.#getRitualData();
        }

        // Anything past this point must be a `SpellcastingEntryPF2e`
        this.#assertEntryIsDocument(this.entry);

        const results: SpellcastingSlotLevel[] = [];
        const spells = this.contents.sort((s1, s2) => (s1.sort || 0) - (s2.sort || 0));
        const signatureSpells = spells.filter((s) => s.system.location.signature);

        const isFlexible = this.entry.isFlexible;

        if (this.entry.isPrepared && this.entry instanceof SpellcastingEntryPF2e) {
            // Prepared Spells. Active spells are what's been prepped.
            for (let level = 0; level <= this.highestLevel; level++) {
                const data = this.entry.system.slots[`slot${level}` as SlotKey];

                // Detect which spells are active. If flexible, it will be set later via signature spells
                const active: (ActiveSpell | null)[] = [];
                const showLevel = this.entry.system.showSlotlessLevels.value || data.max > 0;
                if (showLevel && (level === 0 || !isFlexible)) {
                    const maxPrepared = Math.max(data.max, 0);
                    active.push(...Array(maxPrepared).fill(null));
                    for (const [key, value] of Object.entries(data.prepared)) {
                        const spell = value.id ? this.get(value.id) : null;
                        if (spell) {
                            active[Number(key)] = {
                                castLevel: spell.computeCastLevel(level),
                                spell,
                                expended: !!value.expended,
                            };
                        }
                    }
                }

                results.push({
                    label: level === 0 ? "PF2E.TraitCantrip" : CONFIG.PF2E.spellLevels[level as OneToTen],
                    level: level as ZeroToTen,
                    uses: {
                        value: level > 0 && isFlexible ? data.value || 0 : undefined,
                        max: data.max,
                    },
                    isCantrip: level === 0,
                    active,
                });
            }
        } else if (this.entry.isFocusPool) {
            // Focus Spells. All non-cantrips are grouped together as they're auto-scaled
            const cantrips = spells.filter((spell) => spell.isCantrip);
            const leveled = spells.filter((spell) => !spell.isCantrip);

            if (cantrips.length) {
                const active = await Promise.all(cantrips.map(async (spell) => ({ spell })));
                results.push({
                    label: "PF2E.Actor.Creature.Spellcasting.Cantrips",
                    level: 0,
                    isCantrip: true,
                    active,
                });
            }

            if (leveled.length) {
                const active = await Promise.all(leveled.map(async (spell) => ({ spell })));
                results.push({
                    label: actor.type === "character" ? "PF2E.Focus.Spells" : "PF2E.Focus.Pool",
                    level: Math.max(1, Math.ceil(actor.level / 2)) as OneToTen,
                    isCantrip: false,
                    uses: actor.system.resources.focus ?? { value: 0, max: 0 },
                    active,
                });
            }
        } else {
            // Everything else (Innate/Spontaneous/Ritual)
            const alwaysShowHeader = !this.entry.isRitual;
            const spellsByLevel = groupBy(spells, (spell) => (spell.isCantrip ? 0 : spell.level));
            for (let level = 0; level <= this.highestLevel; level++) {
                const data = this.entry.system.slots[`slot${level}` as SlotKey];
                const spells = spellsByLevel.get(level) ?? [];
                if (alwaysShowHeader || spells.length) {
                    const uses =
                        this.entry.isSpontaneous && level !== 0 ? { value: data.value, max: data.max } : undefined;
                    const active = await Promise.all(
                        spells.map(async (spell) => ({
                            spell,
                            expended: this.entry.isInnate && !spell.system.location.uses?.value,
                            uses: this.entry.isInnate && !spell.unlimited ? spell.system.location.uses : undefined,
                        }))
                    );

                    // These entries hide if there are no active spells at that level, or if there are no spell slots
                    const hideForSpontaneous = this.entry.isSpontaneous && uses?.max === 0 && active.length === 0;
                    const hideForInnate = this.entry.isInnate && active.length === 0;
                    if (!this.entry.system.showSlotlessLevels.value && (hideForSpontaneous || hideForInnate)) continue;

                    results.push({
                        label: level === 0 ? "PF2E.TraitCantrip" : CONFIG.PF2E.spellLevels[level as OneToTen],
                        level: level as ZeroToTen,
                        isCantrip: level === 0,
                        uses,
                        active,
                    });
                }
            }
        }

        // Handle signature spells, we need to add signature spells to each spell level
        if (this.entry.isSpontaneous || isFlexible) {
            for (const spell of signatureSpells) {
                for (const result of results) {
                    if (spell.baseLevel > result.level) continue;
                    if (!this.entry.system.showSlotlessLevels.value && result.uses?.max === 0) continue;

                    const existing = result.active.find((a) => a?.spell.id === spell.id);
                    if (existing) {
                        existing.signature = true;
                    } else {
                        const castLevel = result.level;
                        result.active.push({ spell, castLevel, signature: true, virtual: true });
                    }
                }
            }

            // If all spontaneous or flexible slots are spent for a given level, mark them as expended
            for (const result of results) {
                if (result.level > 0 && result.uses?.value === 0 && result.uses.max > 0) {
                    for (const slot of result.active) {
                        if (slot) slot.expended = true;
                    }
                }
            }
        }

        // If flexible, the limit is the number of slots, we need to notify the user
        const flexibleAvailable = ((): ValueAndMax | null => {
            if (!isFlexible) return null;
            const totalSlots = results
                .filter((result) => !result.isCantrip)
                .map((level) => level.uses?.max || 0)
                .reduce((first, second) => first + second, 0);
            return { value: signatureSpells.length, max: totalSlots };
        })();

        return {
            levels: results,
            flexibleAvailable,
            spellPrepList: this.getSpellPrepList(spells),
        };
    }

    async #getRitualData(): Promise<SpellCollectionData> {
        const groupedByLevel = groupBy(Array.from(this.values()), (s) => s.level);
        const levels = await Promise.all(
            Array.from(groupedByLevel.entries())
                .sort(([a], [b]) => a - b)
                .map(
                    async ([level, spells]): Promise<SpellcastingSlotLevel> => ({
                        label: CONFIG.PF2E.spellLevels[level as OneToTen],
                        level: level as ZeroToTen,
                        isCantrip: false,
                        active: await Promise.all(spells.map(async (spell) => ({ spell }))),
                    })
                )
        );

        return { levels, spellPrepList: null };
    }

    protected getSpellPrepList(spells: SpellPF2e<TActor>[]): Record<number, SpellPrepEntry[]> | null {
        if (!this.entry.isPrepared) return {};

        const spellPrepList: Record<number, SpellPrepEntry[]> = {};
        const spellsByLevel = groupBy(spells, (spell) => (spell.isCantrip ? 0 : spell.baseLevel));
        for (let level = 0; level <= this.highestLevel; level++) {
            // Build the prep list
            spellPrepList[level] =
                spellsByLevel.get(level as ZeroToTen)?.map((spell) => ({
                    spell,
                    signature: this.entry.isFlexible && spell.system.location.signature,
                })) ?? [];
        }

        return Object.values(spellPrepList).some((s) => !!s.length) ? spellPrepList : null;
    }
}

interface SpellCollectionData {
    levels: SpellcastingSlotLevel[];
    flexibleAvailable?: { value: number; max: number } | null;
    spellPrepList: Record<number, SpellPrepEntry[]> | null;
}

export { SpellCollection };
