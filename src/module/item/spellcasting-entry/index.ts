import { CharacterPF2e, CreaturePF2e, NPCPF2e } from "@actor";
import {
    ActiveSpell,
    SlotKey,
    SpellcastingEntry,
    SpellcastingEntryData,
    SpellcastingEntryListData,
    SpellcastingSlotLevel,
    SpellPrepEntry,
} from "./data";
import { SpellPF2e } from "@item/spell";
import { goesToEleven, OneToFour, OneToTen, ZeroToTen } from "@module/data";
import { groupBy, ErrorPF2e } from "@util";
import { ItemPF2e } from "../base";
import { UserPF2e } from "@module/user";
import { Statistic } from "@system/statistic";
import { MagicTradition } from "@item/spell/types";
import { MAGIC_TRADITIONS } from "@item/spell/values";
import { AbilityString } from "@actor/data";

class SpellcastingEntryPF2e extends ItemPF2e implements SpellcastingEntry {
    private _spells: Collection<Embedded<SpellPF2e>> | null = null;

    /** Spellcasting attack and dc data created during actor preparation */
    statistic!: Statistic;

    /** A collection of all spells contained in this entry regardless of organization */
    get spells(): Collection<Embedded<SpellPF2e>> {
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

    get ability(): AbilityString {
        return this.data.data.ability.value || "int";
    }

    /** This entry's magic tradition, defaulting to arcane if unset or invalid */
    get tradition(): MagicTradition {
        const tradition = this.data.data.tradition.value || "arcane";
        return MAGIC_TRADITIONS.has(tradition) ? tradition : "arcane";
    }

    /**
     * Returns the proficiency used for calculations.
     * For innate spells, this is the highest spell proficiency (min trained)
     */
    get rank(): OneToFour {
        const actor = this.actor;
        if (actor instanceof CharacterPF2e) {
            const traditions = actor.data.data.proficiencies.traditions;
            if (this.isInnate) {
                const allRanks = Array.from(MAGIC_TRADITIONS).map((t) => traditions[t].rank);
                return Math.max(1, this.data.data.proficiency.value ?? 1, ...allRanks) as OneToFour;
            } else {
                return Math.max(this.data.data.proficiency.value, traditions[this.tradition].rank) as OneToFour;
            }
        }

        return this.data.data.proficiency.value ?? 0;
    }

    get isPrepared(): boolean {
        return this.data.data.prepared.value === "prepared";
    }

    get isFlexible(): boolean {
        return this.isPrepared && !!this.data.data.prepared.flexible;
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
        const highestSpell = Math.max(...this.spells.map((s) => s.level));
        const actorSpellLevel = Math.ceil((this.actor?.level ?? 0) / 2);
        return Math.min(10, Math.max(highestSpell, actorSpellLevel));
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        // Spellcasting abilities are always at least trained
        this.data.data.proficiency.value = Math.max(1, this.data.data.proficiency.value) as OneToFour;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        // Wipe the internal spells collection so it can be rebuilt later.
        // We can't build the spells collection here since actor.items might not be populated
        this._spells = null;
    }

    override prepareActorData(this: Embedded<SpellcastingEntryPF2e>): void {
        // Upgrade the actor proficiency using the internal ones
        const actor = this.actor;
        // Innate spellcasting will always be elevated by other spellcasting proficiencies but never do
        // the elevating itself
        if (actor instanceof CharacterPF2e && !this.isInnate) {
            const { traditions } = actor.data.data.proficiencies;
            const tradition = traditions[this.tradition];
            const rank = this.data.data.proficiency.value;
            tradition.rank = Math.max(rank, tradition.rank) as OneToFour;
        }
    }

    /** Casts the given spell as if it was part of this spellcasting entry */
    async cast(
        spell: SpellPF2e,
        options: { slot?: number; level?: number; consume?: boolean; message?: boolean } = {}
    ): Promise<void> {
        const consume = options.consume ?? true;
        const message = options.message ?? true;
        const level = options.level ?? spell.level;
        const valid = !consume || spell.isCantrip || (await this.consume(spell, level, options.slot));
        if (message && valid) {
            await spell.toMessage(undefined, { data: { spellLvl: level } });
        }
    }

    async consume(spell: SpellPF2e, level: number, slot?: number): Promise<boolean> {
        const actor = this.actor;
        if (!(actor instanceof CharacterPF2e || actor instanceof NPCPF2e)) {
            throw ErrorPF2e("Spellcasting entries require an actor");
        }
        if (this.isRitual) return true;

        if (this.isFocusPool) {
            const currentPoints = actor.data.data.resources.focus?.value ?? 0;
            if (currentPoints > 0) {
                await actor.update({ "data.resources.focus.value": currentPoints - 1 });
                return true;
            } else {
                ui.notifications.warn(game.i18n.localize("PF2E.Focus.NotEnoughFocusPointsError"));
                return false;
            }
        }

        const levelLabel = game.i18n.localize(CONFIG.PF2E.spellLevels[level as OneToTen]);
        const slotKey = goesToEleven(level) ? (`slot${level}` as const) : "slot0";
        if (this.data.data.slots === null) {
            return false;
        }

        if (this.isPrepared && !this.isFlexible) {
            if (slot === null || typeof slot === "undefined") {
                throw ErrorPF2e("Slot is a required argument for prepared spells");
            }

            const isExpended = this.data.data.slots[slotKey].prepared[slot].expended ?? false;
            if (isExpended) {
                ui.notifications.warn(game.i18n.format("PF2E.SpellSlotExpendedError", { name: spell.name }));
                return false;
            }

            await this.setSlotExpendedState(level, slot, true);
            return true;
        }

        if (this.isInnate) {
            const remainingUses = spell.data.data.location.uses?.value || 0;
            if (remainingUses <= 0) {
                ui.notifications.warn(game.i18n.format("PF2E.SpellSlotExpendedError", { name: spell.name }));
                return false;
            }

            await spell.update({ "data.location.uses.value": remainingUses - 1 });
            return true;
        }

        const slots = this.data.data.slots[slotKey];
        if (slots.value > 0) {
            await this.update({ [`data.slots.${slotKey}.value`]: slots.value - 1 });
            return true;
        } else {
            ui.notifications.warn(
                game.i18n.format("PF2E.SpellSlotNotEnoughError", { name: spell.name, level: levelLabel })
            );
            return false;
        }
    }

    /**
     * Adds a spell to this spellcasting entry, either moving it from another one if its the same actor,
     * or creating a new spell if its not.
     */
    async addSpell(spell: SpellPF2e, targetLevel?: number): Promise<SpellPF2e | null> {
        const actor = this.actor;
        if (!(actor instanceof CreaturePF2e)) {
            throw ErrorPF2e("Spellcasting entries can only exist on creatures");
        }

        targetLevel ??= spell.level;
        const spellcastingEntryId = spell.data.data.location.value;
        if (spellcastingEntryId === this.id && spell.level === targetLevel) {
            return null;
        }

        const isStandardSpell = !(spell.isCantrip || spell.isFocusSpell || spell.isRitual);
        const heightenedUpdate =
            isStandardSpell && (this.isSpontaneous || this.isInnate)
                ? { "data.location.heightenedLevel": Math.max(spell.baseLevel, targetLevel) }
                : {};

        if (spell.actor === actor) {
            return spell.update({ "data.location.value": this.id, ...heightenedUpdate });
        } else {
            const source = spell.clone({ "data.location.value": this.id, ...heightenedUpdate }).toObject();
            const created = (await actor.createEmbeddedDocuments("Item", [source])).shift();

            return created instanceof SpellPF2e ? created : null;
        }
    }

    /** Saves the prepared spell slot data to the spellcasting entry  */
    async prepareSpell(spell: SpellPF2e, spellLevel: number, spellSlot: number): Promise<this> {
        if (spell.baseLevel > spellLevel && !(spellLevel === 0 && spell.isCantrip)) {
            console.warn(`Attempted to add level ${spell.baseLevel} spell to level ${spellLevel} spell slot.`);
            return this;
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
        }

        return this.update(updates);
    }

    /** Removes the spell slot and updates the spellcasting entry */
    unprepareSpell(spellLevel: number, spellSlot: number): Promise<this> {
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
                expended: false,
            },
        });
    }

    /** Sets the expended state of a spell slot and updates the spellcasting entry */
    setSlotExpendedState(spellLevel: number, spellSlot: number, isExpended: boolean): Promise<this> {
        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}.expended`;
        return this.update({ [key]: isExpended });
    }

    /** Returns rendering data to display the spellcasting entry in the sheet */
    getSpellData(): SpellcastingEntryListData {
        const { actor } = this;
        if (!(actor instanceof CharacterPF2e || actor instanceof NPCPF2e)) {
            throw ErrorPF2e("Spellcasting entries can only exist on characters and npcs");
        }

        const results: SpellcastingSlotLevel[] = [];
        const spells = this.spells.contents.sort((s1, s2) => (s1.data.sort || 0) - (s2.data.sort || 0));
        const signatureSpells = spells.filter((s) => s.data.data.location.signature);

        if (this.isPrepared) {
            // Prepared Spells. Active spells are what's been prepped.
            for (let level = 0; level <= this.highestLevel; level++) {
                const data = this.data.data.slots[`slot${level}` as SlotKey];

                // Detect which spells are active. If flexible, it will be set later via signature spells
                const active: (ActiveSpell | null)[] = [];
                const showLevel = this.data.data.showSlotlessLevels.value || data.max > 0;
                if (showLevel && (level === 0 || !this.isFlexible)) {
                    const maxPrepared = Math.max(data.max, 0);
                    active.push(...Array(maxPrepared).fill(null));
                    for (const [key, value] of Object.entries(data.prepared)) {
                        const spell = value.id ? this.spells.get(value.id) : null;
                        if (spell) {
                            active[Number(key)] = {
                                spell,
                                chatData: spell.getChatData(),
                                expended: !!value.expended,
                            };
                        }
                    }
                }

                results.push({
                    label: level === 0 ? "PF2E.TraitCantrip" : CONFIG.PF2E.spellLevels[level as OneToTen],
                    level: level as ZeroToTen,
                    uses: {
                        value: level > 0 && this.isFlexible ? data.value || 0 : undefined,
                        max: data.max,
                    },
                    isCantrip: level === 0,
                    active,
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
                    level: Math.max(1, Math.ceil(actor.level / 2)) as OneToTen,
                    isCantrip: false,
                    uses: actor.data.data.resources.focus ?? { value: 0, max: 0 },
                    active: leveled.map((spell) => ({ spell, chatData: spell.getChatData() })),
                });
            }
        } else {
            // Everything else (Innate/Spontaneous/Ritual)
            const alwaysShowHeader = !this.isRitual;
            const spellsByLevel = groupBy(spells, (spell) => (spell.isCantrip ? 0 : spell.level));
            for (let level = 0; level <= this.highestLevel; level++) {
                const data = this.data.data.slots[`slot${level}` as SlotKey];
                const spells = spellsByLevel.get(level) ?? [];
                if (alwaysShowHeader || spells.length) {
                    const uses = this.isSpontaneous && level !== 0 ? { value: data.value, max: data.max } : undefined;
                    const active = spells.map((spell) => ({
                        spell,
                        chatData: spell.getChatData(),
                        expended: this.isInnate && !spell.data.data.location.uses?.value,
                        uses: this.isInnate && !spell.unlimited ? spell.data.data.location.uses : undefined,
                    }));

                    // These entries hide if there are no active spells at that level, or if there are no spell slots
                    const hideForSpontaneous = this.isSpontaneous && uses?.max === 0 && active.length === 0;
                    const hideForInnate = this.isInnate && active.length === 0;
                    if (!this.data.data.showSlotlessLevels.value && (hideForSpontaneous || hideForInnate)) continue;

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
        if (this.isSpontaneous || this.isFlexible) {
            for (const spell of signatureSpells) {
                for (const result of results) {
                    if (spell.baseLevel > result.level) continue;
                    if (!this.data.data.showSlotlessLevels.value && result.uses?.max === 0) continue;

                    const existing = result.active.find((a) => a?.spell.id === spell.id);
                    if (existing) {
                        existing.signature = true;
                    } else {
                        const chatData = spell.getChatData({}, { spellLvl: result.level });
                        result.active.push({ spell, chatData, signature: true, virtual: true });
                    }
                }
            }
        }

        // If flexible, the limit is the number of slots, we need to notify the user
        const flexibleAvailable = (() => {
            if (!this.isFlexible) return undefined;
            const totalSlots = results
                .filter((result) => !result.isCantrip)
                .map((level) => level.uses?.max || 0)
                .reduce((first, second) => first + second, 0);
            return { value: signatureSpells.length, max: totalSlots };
        })();

        return {
            id: this.id,
            name: this.name,
            statistic: this.statistic.getChatData(),
            tradition: this.tradition,
            castingType: this.data.data.prepared.value,
            isPrepared: this.isPrepared,
            isSpontaneous: this.isSpontaneous,
            isFlexible: this.isFlexible,
            isInnate: this.isInnate,
            isFocusPool: this.isFocusPool,
            isRitual: this.isRitual,
            flexibleAvailable,
            levels: results,
            spellPrepList: this.getSpellPrepList(spells),
        };
    }

    private getSpellPrepList(spells: Embedded<SpellPF2e>[]) {
        if (!this.isPrepared) return {};

        const spellPrepList: Record<number, SpellPrepEntry[]> = {};
        const spellsByLevel = groupBy(spells, (spell) => (spell.isCantrip ? 0 : spell.baseLevel));
        for (let level = 0; level <= this.highestLevel; level++) {
            // Build the prep list
            spellPrepList[level] =
                spellsByLevel.get(level as ZeroToTen)?.map((spell) => ({
                    spell,
                    signature: this.isFlexible && spell.data.data.location.signature,
                })) ?? [];
        }

        return Object.values(spellPrepList).some((s) => !!s.length) ? spellPrepList : null;
    }

    override getRollOptions(prefix = this.type): string[] {
        return [
            `${prefix}:${this.ability}`,
            `${prefix}:${this.tradition}`,
            `${prefix}:${this.data.data.prepared.value}`,
        ];
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        // Clamp slot updates
        if (changed.data?.slots) {
            for (const key of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const) {
                const slotKey = `slot${key}` as const;
                const slotData = changed.data.slots[slotKey];
                if (!slotData) continue;

                if ("max" in slotData) {
                    slotData.max = Math.max(Number(slotData.max) || 0, 0);
                }
                if ("value" in slotData) {
                    const max = "max" in slotData ? Number(slotData?.max) || 0 : this.data.data.slots[slotKey].max;
                    slotData.value = Math.clamped(Number(slotData.value), 0, max);
                }
            }
        }

        await super._preUpdate(changed, options, user);
    }
}

interface SpellcastingEntryPF2e {
    readonly data: SpellcastingEntryData;
}

export { SpellcastingEntryPF2e };
