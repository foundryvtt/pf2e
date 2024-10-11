import { ActorPF2e } from "@actor";
import { ItemPF2e, SpellPF2e, SpellcastingEntryPF2e } from "@item";
import { OneToTen, ValueAndMax, ZeroToTen } from "@module/data.ts";
import { ErrorPF2e, groupBy, localizer, ordinalString } from "@util";
import * as R from "remeda";
import { spellSlotGroupIdToNumber } from "./helpers.ts";
import { BaseSpellcastingEntry, SpellPrepEntry, SpellcastingSlotGroup } from "./types.ts";

class SpellCollection<TActor extends ActorPF2e> extends Collection<SpellPF2e<TActor>> {
    readonly entry: BaseSpellcastingEntry<TActor>;

    readonly actor: TActor;

    readonly name: string;

    constructor(entry: BaseSpellcastingEntry<TActor>, name = entry.name) {
        if (!entry.actor) throw ErrorPF2e("a spell collection must have an associated actor");
        super();

        this.entry = entry;
        this.actor = entry.actor;
        this.name = name;
    }

    get id(): string {
        return this.entry.id;
    }

    get highestRank(): OneToTen {
        const highestSpell = Math.max(...this.map((s) => s.rank));
        const actorSpellRank = Math.ceil((this.actor?.level ?? 0) / 2);
        return Math.min(10, Math.max(highestSpell, actorSpellRank)) as OneToTen;
    }

    #assertEntryIsDocument(
        entry: BaseSpellcastingEntry<TActor | null>,
    ): asserts entry is SpellcastingEntryPF2e<TActor> {
        if (!(entry instanceof ItemPF2e)) {
            throw ErrorPF2e("`this#entry` is not a `SpellcastingEntryPF2e`");
        }
    }

    /**
     * Adds a spell to this spellcasting entry, either moving it from another one if its the same actor,
     * or creating a new spell if its not. If given a rank, it will heighten to that rank if it can be.
     */
    async addSpell(
        spell: SpellPF2e,
        options?: { groupId?: Maybe<SpellSlotGroupId> },
    ): Promise<SpellPF2e<TActor> | null> {
        const actor = this.actor;
        if (!actor.isOfType("creature")) {
            throw ErrorPF2e("Spellcasting entries can only exist on creatures");
        }

        const isStandardSpell = !(spell.isCantrip || spell.isFocusSpell || spell.isRitual);
        const canHeighten = isStandardSpell && (this.entry.isSpontaneous || this.entry.isInnate);

        // Only allow a different slot rank if the spell can heighten
        const groupId = options?.groupId;
        const heightenedRank = canHeighten ? (spellSlotGroupIdToNumber(groupId) ?? spell.rank) : spell.baseRank;

        const spellcastingEntryId = spell.system.location.value;
        if (spellcastingEntryId === this.id && spell.rank === heightenedRank) {
            return null;
        }

        // Don't allow focus spells in non-focus casting entries
        if (spell.isFocusSpell && !this.entry.isFocusPool) {
            this.#warnInvalidDrop("invalid-spell", { spell });
            return null;
        }

        // Warn if the level being dragged to is lower than spell's level
        if (spell.baseRank > heightenedRank && this.id === spell.system.location?.value) {
            this.#warnInvalidDrop("invalid-rank", { spell, groupId });
            return null;
        }

        const heightenedUpdate =
            canHeighten && heightenedRank >= spell.baseRank
                ? { "system.location.heightenedLevel": heightenedRank }
                : {};

        if (spell.actor === actor) {
            return spell.update({
                "system.location.value": this.id,
                ...heightenedUpdate,
            }) as Promise<SpellPF2e<TActor> | null>;
        } else {
            const source = spell.clone({ sort: 0, "system.location.value": this.id, ...heightenedUpdate }).toObject();
            const created = (await actor.createEmbeddedDocuments("Item", [source])).shift();

            return created instanceof SpellPF2e ? created : null;
        }
    }

    /** Swap positions of two spells in the same spell collection and slot group */
    async swapSlotPositions(groupId: string, slotIndexA: number, slotIndexB: number): Promise<this | null> {
        this.#assertEntryIsDocument(this.entry);
        const groupNumber = spellSlotGroupIdToNumber(groupId);
        if (typeof groupNumber !== "number") return null;
        const prepared = this.entry.system.slots[`slot${groupNumber}`].prepared;
        const slotA = prepared.at(slotIndexA);
        const slotB = prepared.at(slotIndexB);
        if (slotA && slotB) {
            prepared[slotIndexA] = slotB;
            prepared[slotIndexB] = slotA;
            const result = await this.entry.update({ [`system.slots.slot${groupNumber}.prepared`]: prepared });
            return result ? this : null;
        }

        return null;
    }

    /** Save the prepared spell slot data to the spellcasting entry  */
    async prepareSpell(spell: SpellPF2e, groupId: SpellSlotGroupId, slotIndex: number): Promise<this | null> {
        this.#assertEntryIsDocument(this.entry);

        if ((groupId === "cantrips") !== spell.isCantrip) {
            this.#warnInvalidDrop("cantrip-mismatch", { spell });
            return null;
        } else if (groupId !== "cantrips" && spell.baseRank > groupId) {
            this.#warnInvalidDrop("invalid-rank", { spell, groupId });
            return null;
        }

        if (CONFIG.debug.hooks) {
            console.debug(
                `PF2e System | Updating location for spell ${spell.name} to match spellcasting entry ${this.id}`,
            );
        }

        const groupNumber = spellSlotGroupIdToNumber(groupId);
        const slots = fu.deepClone(this.entry.system.slots[`slot${groupNumber}`].prepared);
        const expended = slots[slotIndex].expended;
        slots[slotIndex] = { id: spell.id, expended };
        const result = await this.entry.update({ [`system.slots.slot${groupNumber}.prepared`]: slots });

        return result ? this : null;
    }

    /** Clear the spell slot and updates the spellcasting entry */
    async unprepareSpell(groupId: SpellSlotGroupId, slotIndex: number): Promise<this | null> {
        this.#assertEntryIsDocument(this.entry);

        const groupNumber = spellSlotGroupIdToNumber(groupId);
        if (CONFIG.debug.hooks === true) {
            console.debug(
                `PF2e System | Updating spellcasting entry ${this.id} to remove spellslot ${slotIndex} for spell rank ${groupNumber}`,
            );
        }

        const slots = fu.deepClone(this.entry.system.slots[`slot${groupNumber}`].prepared);
        const expended = slots[slotIndex].expended;
        slots[slotIndex] = { id: null, expended };
        const result = await this.entry.update({ [`system.slots.slot${groupNumber}.prepared`]: slots });

        return result ? this : null;
    }

    /** Sets the expended state of a spell slot and updates the spellcasting entry */
    async setSlotExpendedState(groupId: SpellSlotGroupId, slotIndex: number, value: boolean): Promise<this | null> {
        this.#assertEntryIsDocument(this.entry);

        const groupNumber = spellSlotGroupIdToNumber(groupId);
        const prepared = this.entry.system.slots[`slot${groupNumber}`].prepared;
        const slot = prepared[slotIndex];
        if (slot) slot.expended = value;
        const result = await this.entry.update({ [`system.slots.slot${groupNumber}.prepared`]: prepared });

        return result ? this : null;
    }

    async getSpellData({ prepList = false } = {}): Promise<SpellCollectionData> {
        const actor = this.actor;
        if (!actor.isOfType("character", "npc")) {
            throw ErrorPF2e("Spellcasting entries can only exist on characters and npcs");
        }

        if (!(this.entry instanceof SpellcastingEntryPF2e)) {
            return this.#getEphemeralData();
        }

        const groups: SpellcastingSlotGroup[] = [];
        const spells = this.contents
            .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
            .sort((a, b) => a.sort - b.sort);
        const isFlexible = this.entry.isFlexible;
        const maxCantripRank = Math.max(1, Math.ceil(actor.level / 2)) as OneToTen;

        if (this.entry.isPrepared && this.entry instanceof SpellcastingEntryPF2e) {
            // Prepared Spells. Active spells are what's been prepped.
            for (let rank = 0 as ZeroToTen; rank <= this.highestRank; rank++) {
                const group = this.entry.system.slots[`slot${rank}`];
                // Detect which spells are active. If flexible, it will be set later via signature spells
                const showRank = this.entry.showSlotlessRanks || group.max > 0;
                const populateList = showRank && (rank === 0 || !isFlexible);
                const active = populateList
                    ? group.prepared.map((slot) => {
                          const spell = slot && this.get(slot.id ?? "");
                          const castRank = spell?.computeCastRank(rank);
                          return spell ? { castRank, spell, expended: slot.expended } : null;
                      })
                    : [];

                const [groupId, maxRank]: [SpellSlotGroupId, OneToTen] =
                    rank === 0 ? ["cantrips", maxCantripRank] : [rank, rank];
                const label =
                    groupId === "cantrips"
                        ? "PF2E.Actor.Creature.Spellcasting.Cantrips"
                        : game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(rank) });
                const uses = {
                    value: rank > 0 && isFlexible ? group.value || 0 : undefined,
                    max: group.max,
                };

                groups.push({ id: groupId, maxRank, label, uses, active, number: rank });
            }
        } else if (this.entry.isFocusPool) {
            // All non-cantrips are grouped together as they're auto-scaled
            const cantrips = spells.filter((spell) => spell.isCantrip);
            const normal = spells.filter((spell) => !spell.isCantrip);

            if (cantrips.length) {
                const active = cantrips.map((spell) => ({ spell }));
                groups.push({
                    id: "cantrips",
                    maxRank: maxCantripRank,
                    label: "PF2E.Actor.Creature.Spellcasting.Cantrips",
                    active,
                });
            }

            if (normal.length > 0) {
                const active = normal.map((spell) => ({ spell }));
                groups.push({
                    id: maxCantripRank,
                    maxRank: maxCantripRank,
                    label: actor.type === "character" ? "PF2E.Focus.Spells" : "PF2E.Focus.Pool",
                    uses: actor.system.resources.focus ?? { value: 0, max: 0 },
                    active,
                });
            }
        } else {
            // Everything else (Innate/Spontaneous/Ritual)
            const alwaysShowHeader = !this.entry.isRitual;
            const spellsByRank = groupBy(spells, (spell) => (spell.isCantrip ? 0 : spell.rank));
            for (let rank = 0 as ZeroToTen; rank <= this.highestRank; rank++) {
                const data = this.entry.system.slots[`slot${rank}`];
                const spells = spellsByRank.get(rank) ?? [];
                if (alwaysShowHeader || spells.length > 0) {
                    const uses =
                        this.entry.isSpontaneous && rank !== 0 ? { value: data.value, max: data.max } : undefined;
                    const active = spells.map((spell) => ({
                        spell,
                        expended: this.entry.isInnate && !spell.system.location.uses?.value,
                        uses: this.entry.isInnate && !spell.atWill ? spell.system.location.uses : undefined,
                    }));

                    // These entries hide if there are no active spells at that level, or if there are no spell slots
                    const hideForSpontaneous = this.entry.isSpontaneous && uses?.max === 0 && active.length === 0;
                    const hideForInnate = this.entry.isInnate && active.length === 0;
                    if (!this.entry.system.showSlotlessLevels.value && (hideForSpontaneous || hideForInnate)) continue;
                    const [groupId, maxRank]: [SpellSlotGroupId, OneToTen] =
                        rank === 0 ? ["cantrips", maxCantripRank] : [rank, rank];

                    groups.push({
                        id: groupId,
                        label:
                            groupId === "cantrips"
                                ? "PF2E.Actor.Creature.Spellcasting.Cantrips"
                                : game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(rank) }),
                        maxRank,
                        uses,
                        active,
                        number: rank,
                    });
                }
            }
        }

        // Handle signature spells, we need to add signature spells to each spell level
        const canHaveSignatureSpells = this.entry.isSpontaneous || isFlexible;
        const signatureSpells = canHaveSignatureSpells
            ? spells
                  .filter((s) => s.system.location.signature)
                  .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
            : [];
        if (canHaveSignatureSpells) {
            for (const spell of signatureSpells) {
                for (const group of groups) {
                    if (group.id === "cantrips" || spell.baseRank > group.id) continue;
                    if (!this.entry.showSlotlessRanks && group.uses?.max === 0) continue;

                    const existing = group.active.find((a) => a?.spell.id === spell.id);
                    if (existing) {
                        existing.signature = true;
                    } else if (group.uses?.max) {
                        const castRank = group.id;
                        group.active.push({ spell, castRank, signature: true, virtual: true });
                    }
                }
            }

            // If all spontaneous or flexible slots are spent for a given level, mark them as expended
            for (const group of groups) {
                if (group.id !== "cantrips" && group.uses?.value === 0 && group.uses.max >= 0) {
                    for (const slot of group.active) {
                        if (slot) slot.expended = true;
                    }
                }
            }
        }

        // If flexible, the limit is the number of slots, we need to notify the user
        const flexibleAvailable = ((): ValueAndMax | null => {
            if (!isFlexible) return null;
            const totalSlots = groups
                .filter((g) => g.id !== "cantrips")
                .map((g) => g.uses?.max || 0)
                .reduce((a, b) => a + b, 0);
            return { value: signatureSpells.length, max: totalSlots };
        })();

        return {
            groups,
            flexibleAvailable,
            prepList: prepList ? this.getSpellPrepList(spells) : null,
        };
    }

    #getEphemeralData(): SpellCollectionData {
        const groupedByRank = R.groupBy(Array.from(this.values()), (s) => s.rank);
        const groups = R.entries(groupedByRank)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(
                ([rank, spells]): SpellcastingSlotGroup => ({
                    id: Number(rank) as SpellSlotGroupId,
                    label: game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(Number(rank)) }),
                    maxRank: 10,
                    active: spells.map((spell) => ({ spell, expended: spell.parentItem?.uses.value === 0 })),
                }),
            );

        return { groups, prepList: null };
    }

    protected getSpellPrepList(spells: SpellPF2e<TActor>[]): Record<ZeroToTen, SpellPrepEntry[]> {
        const indices = Array.fromRange(11) as ZeroToTen[];
        const prepList: Record<ZeroToTen, SpellPrepEntry[]> = R.mapToObj(indices, (i) => [i, []]);
        if (!this.entry.isPrepared) return prepList;

        for (const spell of spells) {
            if (spell.isCantrip) {
                prepList[0].push({ spell, signature: false });
            } else {
                const signature = this.entry.isFlexible && !!spell.system.location.signature;
                prepList[spell.baseRank].push({ spell, signature });
            }
        }

        return prepList;
    }

    #warnInvalidDrop(warning: DropWarningType, { spell, groupId }: WarnInvalidDropParams): void {
        const localize = localizer("PF2E.Item.Spell.Warning");
        if (warning === "invalid-rank" && typeof groupId === "number") {
            const spellRank = game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(spell.baseRank) });
            const targetRank = game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(groupId) });
            ui.notifications.warn(localize("InvalidRank", { spell: spell.name, spellRank, targetRank }));
        } else if (warning === "cantrip-mismatch") {
            const locKey = spell.isCantrip ? "CantripToRankedSlots" : "NonCantripToCantrips";
            ui.notifications.warn(localize(locKey, { spell: spell.name }));
        } else if (warning === "invalid-spell") {
            const type = game.i18n.format("PF2E.TraitFocus");
            ui.notifications.warn(localize("WrongSpellType", { type }));
        }
    }
}

type SpellSlotGroupId = "cantrips" | OneToTen;

interface SpellCollectionData {
    groups: SpellcastingSlotGroup[];
    flexibleAvailable?: { value: number; max: number } | null;
    prepList: Record<ZeroToTen, SpellPrepEntry[]> | null;
}

type DropWarningType = "invalid-rank" | "cantrip-mismatch" | "invalid-spell";
interface WarnInvalidDropParams {
    spell: SpellPF2e;
    groupId?: Maybe<SpellSlotGroupId>;
}

export { SpellCollection };
export type { SpellCollectionData, SpellSlotGroupId };
