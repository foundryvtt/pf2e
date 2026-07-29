import type { CreaturePF2e } from "@actor";
import { onClickCreateSpell } from "@actor/sheet/helpers.ts";
import type { SpellPF2e } from "@item";
import type { SpellcastingEntryPF2e } from "@item/spellcasting-entry/index.ts";
import type { SpellPrepEntry } from "@item/spellcasting-entry/types.ts";
import { OneToTen, ZeroToTen } from "@module/data.ts";
import { SpellListSearch, type SpellSearchDoc } from "@module/sheet/components/spell-list/search.svelte.ts";
import type { SpellListActions, SpellListGroupData, SpellRowData } from "@module/sheet/components/spell-list/types.ts";
import { getItemFromDragEvent } from "@module/sheet/helpers.ts";
import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { ErrorPF2e, getActionGlyph, ordinalString } from "@util";
import * as R from "remeda";
import Root from "./app.svelte";

interface SpellPreparationConfiguration extends fa.ApplicationConfiguration {
    /** The spellcasting entry the application edits the "spellbook" of */
    entry: SpellcastingEntryPF2e<CreaturePF2e>;
}

class SpellPreparationApp extends SvelteApplicationMixin<
    AbstractConstructorOf<fa.api.ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<SpellPreparationConfiguration> }
>(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<SpellPreparationConfiguration> = {
        id: "{id}",
        classes: ["spell-preparation"],
        position: { width: 515, height: 600 },
        window: { icon: "fa-solid fa-book-open-reader", contentClasses: ["standard-form", "compact"], resizable: true },
    };

    declare options: SpellPreparationConfiguration;

    protected root = Root;

    #search = new SpellListSearch();

    get entry(): SpellcastingEntryPF2e<CreaturePF2e> {
        return this.options.entry;
    }

    get actor(): CreaturePF2e {
        return this.entry.actor;
    }

    override get title(): string {
        return _loc("PF2E.Actor.Creature.SpellPreparation.Title", { actor: this.actor.name });
    }

    protected override _initializeApplicationOptions(
        options: Partial<SpellPreparationConfiguration>,
    ): SpellPreparationConfiguration {
        const initialized = super._initializeApplicationOptions(options) as SpellPreparationConfiguration;
        if (!initialized.entry?.actor) throw ErrorPF2e("Spell preparation requires an actor-owned spellcasting entry");
        initialized.uniqueId = `spell-preparation-${initialized.entry.uuid}`;
        return initialized;
    }

    /**
     * Re-render whenever the actor (and hence its spells) updates. Registering with the entry also
     * makes core close this application when the entry is deleted.
     */
    protected override async _onFirstRender(
        context: fa.ApplicationRenderContext,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onFirstRender(context, options);
        this.actor.apps[this.id] = this;
        this.entry.apps[this.id] = this;
    }

    protected override _tearDown(options: fa.ApplicationClosingOptions): void {
        delete this.actor.apps[this.id];
        delete this.entry.apps[this.id];
        super._tearDown(options);
    }

    protected override async _prepareContext(): Promise<SpellPreparationContext> {
        const entry = this.entry;
        const sheetData = await entry.getSheetData({ prepList: true });
        const maxRank = entry.highestRank;
        const isFlexible = !!entry.isFlexible;
        const flexibleAvailable = sheetData.flexibleAvailable ?? null;
        const atCapacity = !!flexibleAvailable && flexibleAvailable.value >= flexibleAvailable.max;
        const rankLabel = (rank: ZeroToTen): string =>
            rank === 0
                ? _loc("PF2E.Actor.Creature.Spellcasting.Cantrips")
                : _loc("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(rank) });

        // Ranks that prepare into slots: all of them for prepared entries, only cantrips for flexible ones
        const slotRanks = R.range(0, maxRank + 1).filter((r): r is ZeroToTen => !isFlexible || r === 0);
        const slots = new Map(slotRanks.map((r) => [r, entry.system.slots[`slot${r}`]]));
        // A slot id referencing a deleted spell counts as empty, matching the actor sheet's display
        const occupied = (prep: { id: string | null }): boolean => !!prep.id && !!entry.spells?.has(prep.id);
        const preparedCounts = new Map<string, number>();
        for (const slot of slots.values()) {
            for (const prep of slot.prepared) {
                if (occupied(prep) && prep.id) preparedCounts.set(prep.id, (preparedCounts.get(prep.id) ?? 0) + 1);
            }
        }
        const openRanks = slotRanks.filter((r) => {
            const slot = slots.get(r);
            return !!slot && slot.max > 0 && slot.prepared.some((p) => !occupied(p));
        });
        const slotState = (spell: SpellPF2e): SpellRowData["slots"] => {
            // Non-cantrips in a flexible collection are prepared via the signature checkbox, not slots
            if (isFlexible && !spell.isCantrip) return undefined;
            // Preparing a cantrip twice does nothing
            const eligible = spell.isCantrip
                ? openRanks.filter((r) => r === 0 && !preparedCounts.get(spell.id))
                : openRanks.filter((r) => r >= spell.baseRank);
            return {
                prepareTargets: eligible.map((rank) => ({ rank, label: rankLabel(rank) })),
                unprepareTargets: [...slots.entries()]
                    .map(([rank, slot]) => ({
                        rank,
                        label: rankLabel(rank),
                        count: slot.prepared.filter((p) => p.id === spell.id).length,
                    }))
                    .filter((t) => t.count > 0),
                preparedCount: preparedCounts.get(spell.id) ?? 0,
            };
        };

        const searchDocs: SpellSearchDoc[] = [];
        const groups = Object.entries(sheetData.prepList ?? {})
            .filter(([rank]) => Number(rank) <= maxRank)
            .map(([rank, spells]): SpellListGroupData => {
                const rankNumber = Number(rank) as ZeroToTen;
                const slot = slots.get(rankNumber);
                for (const { spell } of spells) {
                    searchDocs.push({ id: spell.id, name: spell.name, traits: spell.system.traits.value.join(" ") });
                }
                return {
                    rank: rankNumber,
                    label: rankLabel(rankNumber),
                    usage:
                        slot && slot.max > 0
                            ? { value: slot.prepared.filter((p) => occupied(p)).length, max: slot.max }
                            : null,
                    spells: spells.map((s) => this.#prepareSpell(s, { atCapacity, isFlexible, slotState })),
                };
            });

        this.#search.index(searchDocs);

        const editable = this.actor.isOwner;
        // These outlive this render, so they read live data instead of values computed above
        const mutations: Omit<SpellListActions, "sendToChat" | "edit"> = {
            delete: (id) => this.#getSpell(id).delete(),
            toggleSignature: (id) => {
                const spell = this.#getSpell(id);
                spell.update({ "system.location.signature": !spell.system.location.signature });
            },
            prepare: (id, rank) => {
                const collection = entry.spells;
                if (!collection) return;
                const slotIndex = entry.system.slots[`slot${rank}`].prepared.findIndex((p) => !occupied(p));
                if (slotIndex < 0) return;
                const groupId = rank === 0 ? "cantrips" : (rank as OneToTen);
                collection.prepareSpell(this.#getSpell(id), groupId, slotIndex);
            },
            unprepare: (id, rank) => {
                const collection = entry.spells;
                if (!collection) return;
                const slotIndex = entry.system.slots[`slot${rank}`].prepared.findIndex((p) => p.id === id);
                if (slotIndex < 0) return;
                const groupId = rank === 0 ? "cantrips" : (rank as OneToTen);
                collection.prepareSpell(null, groupId, slotIndex);
            },
            create: (rank) => {
                const groupId = rank === 0 ? "cantrips" : String(rank);
                onClickCreateSpell(this.actor, { type: "spell", location: entry.id, groupId });
            },
            browse: (rank) => {
                const args: [number, string] = rank === 0 ? [1, "cantrip"] : [rank, "spell"];
                game.pf2e.compendiumBrowser.openSpellTab(entry, ...args);
            },
            handleDrop: (event, target) => this.#onDrop(event, target),
        };

        return {
            foundryApp: this,
            actor: this.actor,
            search: this.#search,
            actions: {
                sendToChat: (id, event) => this.#getSpell(id).toMessage(event instanceof PointerEvent ? event : null),
                edit: (id) => this.#getSpell(id).sheet.render(true),
                ...(editable ? mutations : {}),
            },
            state: {
                name: entry.name,
                hint: _loc(
                    isFlexible
                        ? "PF2E.Actor.Creature.SpellPreparation.HintFlexible"
                        : "PF2E.Actor.Creature.SpellPreparation.Hint",
                ),
                isFlexible,
                flexibleAvailable,
                editable,
                groups,
            },
        };
    }

    #prepareSpell(
        { spell, signature }: SpellPrepEntry,
        options: {
            atCapacity: boolean;
            isFlexible: boolean;
            slotState: (spell: SpellPF2e) => SpellRowData["slots"];
        },
    ): SpellRowData {
        return {
            ...R.pick(spell, ["id", "uuid", "img", "name"]),
            updatedAt: spell._stats.modifiedTime ?? undefined,
            glyph: getActionGlyph(spell.system.time.value),
            defense: spell.defense?.label ?? null,
            range: spell.system.range.value || null,
            isCantrip: spell.isCantrip,
            signature,
            signatureDisabled: options.isFlexible && !signature && !spell.isCantrip && options.atCapacity,
            slots: options.slotState(spell),
        };
    }

    #getSpell(id: string): SpellPF2e<CreaturePF2e> {
        const spell = this.actor.items.get(id, { strict: true });
        if (!spell.isOfType("spell")) throw ErrorPF2e("Unexpected item type");
        return spell;
    }

    /**
     * Handle spell drops: sort within this collection, move from elsewhere on the same actor, or copy from
     * another actor or compendium. `target` carries the row the drop landed on and the insertion side.
     */
    async #onDrop(event: DragEvent, target: { id: string; before: boolean } | null): Promise<void> {
        const item = await getItemFromDragEvent(event);
        if (!item?.isOfType("spell")) return;

        const entry = this.entry;
        const collection = entry.spells;
        if (!collection) return;

        const sortRelative = async (source: SpellPF2e, sortTarget: SpellPF2e, sortBefore: boolean): Promise<void> => {
            const siblings = collection.contents.filter((s) => s.id !== source.id);
            const updates = fu
                .performIntegerSort(source, { target: sortTarget, siblings, sortBefore })
                .map((u) => ({ _id: u.target.id, sort: u.update.sort }));
            await this.actor.updateEmbeddedDocuments("Item", updates);
        };

        if (item.actor === entry.actor && item.system.location.value === entry.id) {
            const sortTarget = target && target.id !== item.id ? collection.get(target.id) : null;
            if (sortTarget) await sortRelative(item, sortTarget, !!target?.before);
        } else {
            const added = await collection.addSpell(item);
            if (!added) return;
            // Additions default to sort 0: place them at the drop position, or after the last spell
            const siblings = collection.contents.filter((s) => s.id !== added.id);
            const sortTarget = target ? collection.get(target.id) : R.firstBy(siblings, [(s) => s.sort, "desc"]);
            if (sortTarget && sortTarget.id !== added.id) await sortRelative(added, sortTarget, !!target?.before);
        }
    }
}

interface SpellPreparationState {
    name: string;
    hint: string;
    isFlexible: boolean;
    flexibleAvailable: { value: number; max: number } | null;
    editable: boolean;
    groups: SpellListGroupData[];
}

interface SpellPreparationContext extends SvelteApplicationRenderContext {
    foundryApp: SpellPreparationApp;
    actor: CreaturePF2e;
    search: SpellListSearch;
    actions: SpellListActions;
    state: SpellPreparationState;
}

export { SpellPreparationApp };
export type { SpellPreparationContext, SpellPreparationState };
