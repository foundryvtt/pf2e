import type { ActorPF2e } from "@actor";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { AttributeString } from "@actor/types.ts";
import type { DatabaseUpdateCallbackOptions } from "@common/abstract/_types.d.mts";
import { ItemPF2e, PhysicalItemPF2e, type SpellPF2e } from "@item";
import { MagicTradition } from "@item/spell/types.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { OneToTen, ZeroToFour, ZeroToTen } from "@module/data.ts";
import { Statistic } from "@system/statistic/index.ts";
import { ErrorPF2e, ordinalString, setHasElement, sluggify } from "@util";
import * as R from "remeda";
import { SpellCollection, type SpellSlotGroupId } from "./collection.ts";
import { SpellcastingEntrySource, SpellcastingEntrySystemData } from "./data.ts";
import { createCounteractStatistic } from "./helpers.ts";
import { CastOptions, SpellcastingCategory, SpellcastingEntry, SpellcastingSheetData } from "./types.ts";

class SpellcastingEntryPF2e<TParent extends ActorPF2e | null = ActorPF2e | null>
    extends ItemPF2e<TParent>
    implements SpellcastingEntry<TParent>
{
    declare spells: SpellCollection<NonNullable<TParent>> | null;

    /** Spellcasting attack and dc data created during actor preparation */
    declare statistic: Statistic;

    get attribute(): AttributeString {
        return this.system.ability.value || "cha";
    }

    get counteraction(): Statistic {
        if (!this.actor) throw ErrorPF2e("Unexpected missing actor");
        return createCounteractStatistic(this as SpellcastingEntryPF2e<ActorPF2e>);
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

    get isEphemeral(): false {
        return false;
    }

    get highestRank(): ZeroToTen {
        return this.spells?.highestRank ?? 0;
    }

    get showSlotlessRanks(): boolean {
        return this.system.showSlotlessLevels.value;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.spells = null;
        this.system.prepared.flexible ??= false;
        this.system.prepared.validItems ||= null;

        if (this.isPrepared) {
            const isFlexible = this.isFlexible;
            for (const [key, group] of Object.entries(this.system.slots)) {
                const emptyList = isFlexible && key !== "slot0";
                group.prepared = emptyList
                    ? []
                    : R.sortBy(Object.values(group.prepared).filter(R.isTruthy), (s) => s.id === null);
                group.prepared.length = emptyList ? 0 : group.max;
                for (const index of Array.fromRange(group.prepared.length)) {
                    const slot = (group.prepared[index] ??= { id: null, expended: false });
                    slot.expended ??= false;
                }
            }
        }

        // Assign a default "invalid" statistic in case something goes wrong
        const actor = this.actor;
        if (actor) {
            this.statistic = new Statistic(actor, {
                slug: this.slug ?? sluggify(this.name),
                label: "PF2E.Actor.Creature.Spellcasting.InvalidProficiency",
                check: { type: "check" },
            });
        }
    }

    override prepareSiblingData(this: SpellcastingEntryPF2e<ActorPF2e>): void {
        const actor = this.actor;
        this.spells = new SpellCollection(this) as SpellCollection<NonNullable<TParent>>;
        const spells = actor.itemTypes.spell.filter(
            (s): s is SpellPF2e<NonNullable<TParent>> => s.system.location.value === this.id,
        );
        for (const spell of spells) {
            this.spells.set(spell.id, spell);
        }

        actor.spellcasting?.collections.set(this.spells.id, this.spells);
    }

    override prepareActorData(this: SpellcastingEntryPF2e<ActorPF2e>): void {
        if ((this.spells?.size ?? 0) > 0) {
            const rollOptions = this.actor.flags.pf2e.rollOptions;
            rollOptions.all["self:caster"] = true;
            rollOptions.all[`self:caster:tradition:${this.tradition}`] = true;
        }
    }

    /** Prepares the statistic for this spellcasting entry */
    prepareStatistic(): void {
        const actor = this.actor;
        if (!actor) return;
        const { attribute, tradition } = this;

        const slug = this.slug ?? sluggify(`${this.name}-spellcasting`);
        const baseDomains = ["all", `${attribute}-based`, "spell-attack-dc"];
        const checkDomains = [
            `${tradition}-spell-attack`,
            "spell-attack",
            "spell-attack-roll",
            "attack",
            "attack-roll",
        ];
        const dcDomains = [`${tradition}-spell-dc`, "spell-dc"];

        // Prepare casting entry based on actor type
        // Characters prepare spellcasting by extending a statistic.
        // NPCs prepare spellcasting with explicit values.
        if (actor.isOfType("character")) {
            // Spellcasting entries extend other statistics, usually base spellcasting, but sometimes class dc
            const baseStat = actor.getStatistic(this.system.proficiency.slug || "base-spellcasting");
            if (!baseStat) return;

            this.system.ability.value = baseStat.attribute ?? this.system.ability.value;
            this.system.proficiency.value = Math.max(this.rank, baseStat.rank ?? 0) as ZeroToFour;
            this.statistic = baseStat.extend({
                slug,
                label:
                    baseStat.slug === "base-spellcasting" && tradition
                        ? CONFIG.PF2E.magicTraditions[tradition]
                        : baseStat.label,
                attribute: this.attribute,
                rank: this.rank,
                rollOptions: this.getRollOptions("spellcasting"),
                domains: baseDomains,
                check: {
                    type: "attack-roll",
                    domains: checkDomains,
                },
                dc: { domains: dcDomains },
            });
        } else if (actor.isOfType("npc")) {
            // Check and save modifier
            const adjustment = actor.isElite ? 2 : actor.isWeak ? -2 : 0;
            const baseMod = Number(this.system?.spelldc?.value ?? 0) + adjustment;
            const baseDC = Number(this.system?.spelldc?.dc ?? 0) + adjustment;

            // Assign statistic data to the spellcasting entry
            this.statistic = new Statistic(actor as ActorPF2e, {
                slug,
                attribute: this.attribute,
                label: CONFIG.PF2E.magicTraditions[tradition ?? "arcane"],
                domains: baseDomains,
                rollOptions: this.getRollOptions("spellcasting"),
                check: {
                    type: "attack-roll",
                    domains: checkDomains,
                    modifiers: [new ModifierPF2e({ slug: "base", label: "PF2E.ModifierTitle", modifier: baseMod })],
                },
                dc: {
                    domains: dcDomains,
                    modifiers: [new ModifierPF2e({ slug: "base", label: "PF2E.ModifierTitle", modifier: baseDC - 10 })],
                },
            });
        } else {
            throw ErrorPF2e(`Actor type ${actor.type} does not support spellcasting entries`);
        }

        // Check if the new statistic exceeds the current actor best spell dc
        const stat = actor.isOfType("npc")
            ? { value: this.statistic.dc.value }
            : { value: this.statistic.dc.value, rank: this.statistic.rank ?? 0 };
        const attributes = actor.system.attributes;
        if (stat.value > attributes.classOrSpellDC.value) {
            attributes.classOrSpellDC = stat;
        }
        if (!attributes.spellDC || stat.value > attributes.spellDC.value) {
            attributes.spellDC = stat;
        }
    }

    /** All spells associated with this spellcasting entry on the actor that should also be deleted */
    override getLinkedItems(): SpellPF2e<ActorPF2e>[] {
        return this.actor?.itemTypes.spell.filter((i) => i.system.location.value === this.id) ?? [];
    }

    /** Whether the spell is valid to cast by this spellcasting entry */
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

    /** Cast the given spell as if it was part of this spellcasting entry. */
    async cast(spell: SpellPF2e<ActorPF2e>, options: CastOptions = {}): Promise<void> {
        const consume = options.consume ?? true;
        const message = options.message ?? true;
        const rank = options.rank ?? spell.rank;
        const valid = !consume || spell.atWill || (await this.consume(spell, rank, options.slotId));
        if (message && valid) {
            spell.system.location.value ??= this.id;
            const castRank = spell.computeCastRank(rank);
            await spell.toMessage(null, { rollMode: options.rollMode, data: { castRank } });
        }
    }

    async consume(spell: SpellPF2e<ActorPF2e>, rank: number, slotIndex?: number): Promise<boolean> {
        const actor = this.actor;
        if (!actor?.isOfType("character", "npc")) {
            throw ErrorPF2e("Spellcasting entries require an actor");
        }
        const fpCost = spell.system.cast.focusPoints;
        if (this.isRitual || ((spell.isFocusSpell || spell.isCantrip) && fpCost === 0)) {
            return true;
        }
        spell = spell.original ? spell.original : spell;

        if (actor.isOfType("character", "npc") && fpCost > 0) {
            const currentPoints = actor.system.resources.focus?.value ?? 0;
            if (currentPoints >= fpCost) {
                await actor.update({ "system.resources.focus.value": currentPoints - fpCost });
                return true;
            } else {
                ui.notifications.warn(game.i18n.localize("PF2E.Focus.NotEnoughFocusPointsError"));
                return false;
            }
        }

        const rankLabel = game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(rank) });
        const slotKey = rank.between(1, 10) ? (`slot${rank}` as `slot${OneToTen}`) : "slot0";
        if (this.system.slots === null || !this.spells) {
            return false;
        }

        // For prepared spells, we deduct the slot. We use the given one or try to find a good match
        if (this.isPrepared && !this.isFlexible) {
            const slots = this.system.slots[slotKey].prepared;
            const resolvedIndex = ((): number | null => {
                if (typeof slotIndex === "number" && slotIndex >= 0 && slots[slotIndex]) {
                    return slotIndex;
                }
                const unexpendedIndex = slots.findIndex((s) => s.id === spell.id && !s.expended);
                if (unexpendedIndex > -1) return unexpendedIndex;
                const expendedIndex = slots.findIndex((s) => s.id === spell.id);
                return expendedIndex > -1 ? expendedIndex : null;
            })();
            if (resolvedIndex === null) {
                throw ErrorPF2e("Slot not given for prepared spell, and no alternative slot was found");
            }
            if (slots[resolvedIndex].expended) {
                ui.notifications.warn(game.i18n.format("PF2E.SpellSlotExpendedError", { spell: spell.name }));
                return false;
            }

            if (rank.between(1, 10)) {
                const groupId = rank as SpellSlotGroupId;
                return !!(await this.spells.setSlotExpendedState(groupId, resolvedIndex, true));
            }
        }

        if (this.isInnate) {
            const remainingUses = spell.system.location.uses?.value || 0;
            if (remainingUses <= 0) {
                ui.notifications.warn(game.i18n.format("PF2E.SpellSlotExpendedError", { spell: spell.name }));
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
            const rank = game.i18n.lang === "de" ? rankLabel : rankLabel.toLocaleLowerCase(game.i18n.lang);
            ui.notifications.warn(game.i18n.format("PF2E.SpellSlotNotEnoughError", { spell: spell.name, rank }));
            return false;
        }
    }

    /**
     * Adds a spell to this spellcasting entry, either moving it from another one if its the same actor,
     * or creating a new spell if its not.
     */
    async addSpell(
        spell: SpellPF2e<NonNullable<TParent>>,
        { groupId }: { groupId: Maybe<SpellSlotGroupId> },
    ): Promise<SpellPF2e<NonNullable<TParent>> | null> {
        const result = this.spells?.addSpell(spell, { groupId });
        return result ? spell : null;
    }

    /** Saves the prepared spell slot data to the spellcasting entry  */
    async prepareSpell(spell: SpellPF2e | null, groupId: SpellSlotGroupId, spellSlot: number): Promise<Maybe<this>> {
        const result = this.spells?.prepareSpell(spell, groupId, spellSlot);
        return result ? this : null;
    }

    /** Sets the expended state of a spell slot and updates the spellcasting entry */
    async setSlotExpendedState(groupId: SpellSlotGroupId, slotId: number, value: boolean): Promise<Maybe<this>> {
        const result = this.spells?.setSlotExpendedState(groupId, slotId, value);
        return result ? this : null;
    }

    /** Returns rendering data to display the spellcasting entry in the sheet */
    async getSheetData({ prepList = false } = {}): Promise<SpellcastingSheetData> {
        if (!this.actor?.isOfType("character", "npc")) {
            throw ErrorPF2e("Spellcasting entries can only exist on characters and npcs");
        }

        const defaultData = { groups: [], prepList: null };
        const collectionData =
            this.category === "items" ? defaultData : ((await this.spells?.getSpellData({ prepList })) ?? defaultData);

        return fu.mergeObject(collectionData, {
            id: this.id,
            name: this.name,
            sort: this.sort,
            attribute: this.attribute,
            statistic: this.statistic.getChatData(),
            tradition: this.tradition,
            category: this.system.prepared.value,
            isPrepared: this.isPrepared,
            isSpontaneous: this.isSpontaneous,
            isFlexible: this.isFlexible,
            isInnate: this.isInnate,
            isFocusPool: this.isFocusPool,
            isRitual: false,
            isEphemeral: false,
            hasCollection: true,
            usesSpellProficiency: !this.system.proficiency.slug,
            showSlotlessRanks: this.showSlotlessRanks,
        });
    }

    override getRollOptions(prefix = this.type): string[] {
        return [
            `${prefix}:${this.attribute}`,
            `${prefix}:attribute:${this.attribute}`,
            `${prefix}:${this.category}`,
            `${prefix}:category:${this.category}`,
            `${prefix}:${this.tradition}`,
            `${prefix}:tradition:${this.tradition}`,
        ];
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
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
                    slotData.value = Math.clamp(Number(slotData.value), 0, max);
                }
            }
        }
        return super._preUpdate(changed, options, user);
    }
}

interface SpellcastingEntryPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: SpellcastingEntrySource;
    system: SpellcastingEntrySystemData;
}

export { SpellcastingEntryPF2e };
