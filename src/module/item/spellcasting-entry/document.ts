import { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import { AbilityString } from "@actor/types.ts";
import { ItemPF2e, PhysicalItemPF2e, SpellPF2e } from "@item";
import { MagicTradition } from "@item/spell/types.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { goesToEleven, OneToFour, OneToTen, ZeroToFour } from "@module/data.ts";
import { UserPF2e } from "@module/user/index.ts";
import { Statistic } from "@system/statistic/index.ts";
import { ErrorPF2e, setHasElement, sluggify } from "@util";
import { SpellCollection } from "./collection.ts";
import { SpellcastingEntrySource, SpellcastingEntrySystemData } from "./data.ts";
import {
    SpellcastingCategory,
    SpellcastingEntry,
    SpellcastingEntryPF2eCastOptions,
    SpellcastingSheetData,
} from "./types.ts";

class SpellcastingEntryPF2e<TParent extends ActorPF2e | null = ActorPF2e | null>
    extends ItemPF2e<TParent>
    implements SpellcastingEntry<TParent>
{
    declare spells: SpellCollection<NonNullable<TParent>, this> | null;

    /** Spellcasting attack and dc data created during actor preparation */
    declare statistic: Statistic;

    get ability(): AbilityString {
        return this.system.ability.value || "int";
    }

    /** This entry's magic tradition, null if the spell's tradition should be used instead */
    get tradition(): MagicTradition | null {
        const defaultTradition = this.system.prepared.value === "items" ? null : "arcane";
        const tradition = this.system.tradition.value;
        return setHasElement(MAGIC_TRADITIONS, tradition) ? tradition : defaultTradition;
    }

    get category(): SpellcastingCategory {
        return this.system.prepared.value;
    }

    /**
     * Returns the proficiency used for calculations.
     * For innate spells, this is the highest spell proficiency (min trained)
     */
    get rank(): ZeroToFour {
        return this.system.proficiency.value ?? 0;
    }

    get isPrepared(): boolean {
        return this.system.prepared.value === "prepared";
    }

    get isFlexible(): boolean {
        return this.isPrepared && !!this.system.prepared.flexible;
    }

    get isSpontaneous(): boolean {
        return this.system.prepared.value === "spontaneous";
    }

    get isInnate(): boolean {
        return this.system.prepared.value === "innate";
    }

    get isFocusPool(): boolean {
        return this.system.prepared.value === "focus";
    }

    /** Ritual spellcasting is handled separately */
    get isRitual(): false {
        return false;
    }

    get highestLevel(): number {
        return this.spells?.highestLevel ?? 0;
    }

    get showSlotlessLevels(): boolean {
        return this.system.showSlotlessLevels.value;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.system.proficiency.slug ||= this.system.tradition.value;
        // Spellcasting abilities are always at least trained
        this.system.proficiency.value = Math.max(1, this.system.proficiency.value) as OneToFour;

        this.system.prepared.flexible ??= false;
        this.system.prepared.validItems ||= null;

        // Assign a default "invalid" statistic in case something goes wrong
        if (this.actor) {
            this.statistic = new Statistic(this.actor, {
                slug: this.slug ?? sluggify(this.name),
                label: "PF2E.Actor.Creature.Spellcasting.InvalidProficiency",
                check: { type: "check" },
            });
        }
    }

    override prepareSiblingData(this: SpellcastingEntryPF2e<ActorPF2e>): void {
        if (!this.actor || this.system.prepared.value === "items") {
            this.spells = null;
        } else {
            this.spells = new SpellCollection(this);
            const spells = this.actor.itemTypes.spell.filter((i) => i.system.location.value === this.id);
            for (const spell of spells) {
                this.spells.set(spell.id, spell);
            }

            this.actor.spellcasting.collections.set(this.spells.id, this.spells);
        }
    }

    override prepareActorData(this: SpellcastingEntryPF2e<ActorPF2e>): void {
        const actor = this.actor;

        // Upgrade the actor proficiency using the internal ones
        // Innate spellcasting will always be elevated by other spellcasting proficiencies but never do
        // the elevating itself
        const tradition = this.tradition;
        if (actor.isOfType("character") && !this.isInnate && tradition) {
            const proficiency = actor.system.proficiencies.traditions[tradition];
            const rank = this.system.proficiency.value;
            proficiency.rank = Math.max(rank, proficiency.rank) as OneToFour;
        }
    }

    /** All spells associated with this spellcasting entry on the actor that should also be deleted */
    override getLinkedItems(): SpellPF2e<ActorPF2e>[] {
        return this.actor?.itemTypes.spell.filter((i) => i.system.location.value === this.id) ?? [];
    }

    /** Returns if the spell is valid to cast by this spellcasting entry */
    canCast(spell: SpellPF2e, { origin }: { origin?: PhysicalItemPF2e } = {}): boolean {
        // For certain collection-less modes, the spell must come from an item
        if (this.system.prepared.value === "items") {
            if (!origin) return false;

            // Eventually this will use predicates, but right now its just a simple match
            return this.system.prepared.validItems === "scroll" ? origin.traits.has("scroll") : true;
        }

        // Only prepared/spontaneous casting count as a "spellcasting class feature"
        // for the purpose of using the "Cast a Spell" activation component
        const isSpellcastingFeature = this.isPrepared || this.isSpontaneous;
        if (origin && !isSpellcastingFeature) {
            return false;
        }

        // Past here, a spell collection is required
        if (!this.spells) return false;

        const matchesTradition = this.tradition && spell.traditions.has(this.tradition);
        const isInSpellList = this.spells.some((s) => s.slug === spell.slug);
        return matchesTradition || isInSpellList;
    }

    /** Casts the given spell as if it was part of this spellcasting entry */
    async cast(spell: SpellPF2e<ActorPF2e>, options: SpellcastingEntryPF2eCastOptions = {}): Promise<void> {
        const consume = options.consume ?? true;
        const message = options.message ?? true;
        const slotLevel = options.level ?? spell.level;
        const valid = !consume || spell.isCantrip || (await this.consume(spell, slotLevel, options.slot));
        if (message && valid) {
            const castLevel = spell.computeCastLevel(slotLevel);
            await spell.toMessage(undefined, { rollMode: options.rollMode, data: { castLevel } });
        }
    }

    async consume(spell: SpellPF2e<ActorPF2e>, level: number, slot?: number): Promise<boolean> {
        const actor = this.actor;
        if (!(actor instanceof CharacterPF2e || actor instanceof NPCPF2e)) {
            throw ErrorPF2e("Spellcasting entries require an actor");
        }
        if (this.isRitual) return true;

        if (spell.isVariant) {
            spell = spell.original!;
        }

        if (this.isFocusPool && actor.isOfType("character", "npc")) {
            const currentPoints = actor.system.resources.focus?.value ?? 0;
            if (currentPoints > 0) {
                await actor.update({ "system.resources.focus.value": currentPoints - 1 });
                return true;
            } else {
                ui.notifications.warn(game.i18n.localize("PF2E.Focus.NotEnoughFocusPointsError"));
                return false;
            }
        }

        const levelLabel = game.i18n.localize(CONFIG.PF2E.spellLevels[level as OneToTen]);
        const slotKey = goesToEleven(level) ? (`slot${level}` as const) : "slot0";
        if (this.system.slots === null || !this.spells) {
            return false;
        }

        // For prepared spells, we deduct the slot. We use the given one or try to find a good match
        if (this.isPrepared && !this.isFlexible) {
            const preparedData = this.system.slots[slotKey].prepared;
            slot ??= Number(
                Object.entries(preparedData)
                    .filter(([_, slot]) => slot.id === spell.id && !slot.expended)
                    .at(0)?.[0]
            );

            if (!Number.isInteger(slot)) {
                throw ErrorPF2e("Slot not given for prepared spell, and no alternative slot was found");
            }

            const isExpended = preparedData[slot].expended ?? false;
            if (isExpended) {
                ui.notifications.warn(game.i18n.format("PF2E.SpellSlotExpendedError", { name: spell.name }));
                return false;
            }

            await this.spells.setSlotExpendedState(level, slot, true);
            return true;
        }

        if (this.isInnate) {
            const remainingUses = spell.system.location.uses?.value || 0;
            if (remainingUses <= 0) {
                ui.notifications.warn(game.i18n.format("PF2E.SpellSlotExpendedError", { name: spell.name }));
                return false;
            }
            await spell.update({ "system.location.uses.value": remainingUses - 1 });
            return true;
        }

        const slots = this.system.slots[slotKey];
        if (slots.value > 0) {
            await this.update({ [`system.slots.${slotKey}.value`]: slots.value - 1 });
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
    async addSpell(
        spell: SpellPF2e<TParent | null>,
        options?: { slotLevel?: number }
    ): Promise<SpellPF2e<NonNullable<TParent>> | null> {
        return this.spells?.addSpell(spell, options) ?? null;
    }

    /** Saves the prepared spell slot data to the spellcasting entry  */
    async prepareSpell(spell: SpellPF2e, slotLevel: number, spellSlot: number): Promise<this | null> {
        return this.spells?.prepareSpell(spell, slotLevel, spellSlot) ?? null;
    }

    /** Removes the spell slot and updates the spellcasting entry */
    async unprepareSpell(spellLevel: number, slotLevel: number): Promise<this | null> {
        return this.spells?.unprepareSpell(spellLevel, slotLevel) ?? null;
    }

    /** Sets the expended state of a spell slot and updates the spellcasting entry */
    async setSlotExpendedState(slotLevel: number, spellSlot: number, isExpended: boolean): Promise<this | null> {
        return this.spells?.setSlotExpendedState(slotLevel, spellSlot, isExpended) ?? null;
    }

    /** Returns rendering data to display the spellcasting entry in the sheet */
    async getSheetData(): Promise<SpellcastingSheetData> {
        if (!this.actor?.isOfType("character", "npc")) {
            throw ErrorPF2e("Spellcasting entries can only exist on characters and npcs");
        }

        const spellCollectionData = (await this.spells?.getSpellData()) ?? { levels: [], spellPrepList: null };

        return {
            id: this.id,
            name: this.name,
            sort: this.sort,
            ability: this.ability,
            statistic: this.statistic.getChatData(),
            tradition: this.tradition,
            category: this.system.prepared.value,
            isPrepared: this.isPrepared,
            isSpontaneous: this.isSpontaneous,
            isFlexible: this.isFlexible,
            isInnate: this.isInnate,
            isFocusPool: this.isFocusPool,
            isRitual: this.isRitual,
            hasCollection: !!this.spells,
            showSlotlessLevels: this.showSlotlessLevels,
            ...spellCollectionData,
        };
    }

    override getRollOptions(prefix = "spellcasting"): string[] {
        return [`${prefix}:${this.ability}`, `${prefix}:${this.tradition}`, `${prefix}:${this.system.prepared.value}`];
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
        // Clamp slot updates
        if (changed.system?.slots) {
            for (const key of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const) {
                const slotKey = `slot${key}` as const;
                const slotData = changed.system.slots[slotKey];
                if (!slotData) continue;

                if ("max" in slotData) {
                    slotData.max = Math.max(Number(slotData.max) || 0, 0);
                }
                if ("value" in slotData) {
                    const max = "max" in slotData ? Number(slotData?.max) || 0 : this.system.slots[slotKey].max;
                    slotData.value = Math.clamped(Number(slotData.value), 0, max);
                }
            }
        }

        await super._preUpdate(changed, options, user);
    }

    /* -------------------------------------------- */
    /*  Deprecations and Compatibility              */
    /* -------------------------------------------- */

    /**
     * To prevent (or delay) console spam, will send out a deprecation notice in a later release
     * @deprecated
     */
    getSpellData(): Promise<SpellcastingSheetData> {
        return this.getSheetData();
    }
}

interface SpellcastingEntryPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: SpellcastingEntrySource;
    system: SpellcastingEntrySystemData;
}

export { SpellcastingEntryPF2e };
