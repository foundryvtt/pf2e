import { ActorPF2e, CreaturePF2e } from "@actor";
import { onClickCreateSpell } from "@actor/sheet/helpers.ts";
import { ItemSummaryRenderer } from "@actor/sheet/item-summary-renderer.ts";
import { ItemPF2e, SpellPF2e } from "@item";
import { ItemSourcePF2e, SpellSource } from "@item/base/data/index.ts";
import { SpellcastingEntryPF2e, SpellcastingSheetData } from "@item/spellcasting-entry/index.ts";
import { ErrorPF2e, htmlClosest, htmlQueryAll } from "@util";
import MiniSearch from "minisearch";
import * as R from "remeda";

/**
 * Sheet used to render the the spell list for prepared casting.
 * It overrides the actor sheet to inherit important drag/drop behavior for actor items (the spells).
 */
class SpellPreparationSheet<TActor extends CreaturePF2e> extends ActorSheet<TActor> {
    /** Implementation used to handle the toggling and rendering of item summaries */
    itemRenderer: ItemSummaryRenderer<TActor> = new ItemSummaryRenderer(this);

    #searchEngine = new MiniSearch<Pick<SpellPF2e<TActor>, "id" | "name">>({
        fields: ["name"],
        idField: "id",
        processTerm: (t) => (t.length > 1 ? t.toLocaleLowerCase(game.i18n.lang) : null),
        searchOptions: { combineWith: "AND", prefix: true },
    });

    constructor(
        public item: SpellcastingEntryPF2e<TActor>,
        options: Partial<ActorSheetOptions>,
    ) {
        super(item.actor, options);
    }

    static override get defaultOptions(): ActorSheetOptions {
        return {
            ...super.defaultOptions,
            classes: ["default", "sheet", "spellcasting-entry", "preparation"],
            width: 480,
            height: 600,
            template: "systems/pf2e/templates/actors/spellcasting-prep-sheet.hbs",
            scrollY: [".sheet-content"],
            filters: [{ inputSelector: "input[type=search]", contentSelector: "ol.directory-list" }],
            sheetConfig: false,
        };
    }

    /** Avoid conflicting with the real actor sheet */
    override get id(): string {
        return `${super.id}-spellprep-${this.item.id}`;
    }

    override get title(): string {
        return game.i18n.format("PF2E.Actor.Creature.SpellPreparation.Title", { actor: this.actor.name });
    }

    /**
     * This being an actor sheet saves us from most drag and drop re-implementation,
     * but we still have a gotcha in the form of the header buttons.
     */
    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        return super._getHeaderButtons().filter((b) => b.class === "close");
    }

    override async getData(): Promise<SpellPreparationSheetData<TActor>> {
        this.#searchEngine.removeAll();
        const entry = await this.item.getSheetData();
        const spells = Object.values(entry.spellPrepList ?? {})
            .flat()
            .map((s) => R.pick(s.spell, ["id", "name"]));
        this.#searchEngine.addAll(spells);

        return {
            ...(await super.getData()),
            owner: this.actor.isOwner,
            entry,
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        this.itemRenderer.activateListeners(html);

        html.addEventListener("click", (event) => {
            const anchor = htmlClosest(event.target, "[data-action]");
            const action = anchor?.dataset.action;
            if (!(anchor && action)) return;

            switch (action) {
                case "edit-spell": {
                    this.#getSpellFromEvent(event).sheet.render(true);
                    return;
                }
                case "delete-spell": {
                    this.#getSpellFromEvent(event).delete();
                    return;
                }
                case "spell-to-chat": {
                    this.#getSpellFromEvent(event).toMessage(event);
                    return;
                }
                case "toggle-flexible-collection": {
                    const spell = this.#getSpellFromEvent(event);
                    spell.update({ "system.location.signature": !spell.system.location.signature });
                    return;
                }
                case "create-spell": {
                    onClickCreateSpell(this.actor, { ...anchor?.dataset, location: this.item.id });
                    return;
                }
                case "browse-spells": {
                    const level = Number(anchor.dataset.level) || 0;
                    game.pf2e.compendiumBrowser.openSpellTab(this.item, level);
                }
            }
        });
    }

    #getSpellFromEvent(event: MouseEvent): SpellPF2e<ActorPF2e> {
        const itemId = htmlClosest(event.target, "li[data-item-id]")?.dataset.itemId;
        const item = this.actor.items.get(itemId, { strict: true });
        if (!item.isOfType("spell")) throw ErrorPF2e("Unexpected item type");

        return item;
    }

    /** Filter spells by search query */
    protected override _onSearchFilter(
        _event: KeyboardEvent,
        query: string,
        _rgx: RegExp,
        html: HTMLElement | null,
    ): void {
        const matches: Set<string> =
            query.length > 1 ? new Set(this.#searchEngine.search(query).map((s) => s.id)) : new Set();
        for (const row of htmlQueryAll(html, "li[data-item-id]")) {
            row.hidden = query.length > 1 && !matches.has(row.dataset.itemId ?? "");
        }
    }

    /** Allow adding new spells to the shortlist by dragging directly into the window */
    protected override async _onDropItemCreate(
        itemSource: ItemSourcePF2e | ItemSourcePF2e[],
    ): Promise<ItemPF2e<TActor>[]>;
    protected override async _onDropItemCreate(itemSource: ItemSourcePF2e | ItemSourcePF2e[]): Promise<Item<TActor>[]> {
        const sources = Array.isArray(itemSource) ? itemSource : [itemSource];
        const spellSources = sources.filter((source): source is SpellSource => source.type === "spell");
        for (const spellSource of spellSources) {
            spellSource.system.location.value = this.item.id;
        }

        return super._onDropItemCreate(spellSources);
    }

    /** Allow transferring spells between open windows */
    protected override async _onSortItem(
        event: DragEvent,
        itemData: ItemSourcePF2e,
    ): Promise<CollectionValue<TActor["items"]>[]>;
    protected override async _onSortItem(event: DragEvent, itemData: ItemSourcePF2e): Promise<ItemPF2e<ActorPF2e>[]> {
        if (itemData.type !== "spell") return [];

        const spell = this.actor.items.get(itemData._id!);
        if (itemData.system.location.value !== this.item.id && spell?.isOfType("spell")) {
            const addedSpell = await this.item.spells?.addSpell(spell);
            return [addedSpell ?? []].flat();
        }

        return super._onSortItem(event, itemData);
    }

    /** Override of inner render function to maintain item summary state */
    protected override async _renderInner(data: Record<string, unknown>, options: RenderOptions): Promise<JQuery> {
        return this.itemRenderer.saveAndRestoreState(() => {
            return super._renderInner(data, options);
        });
    }
}

interface SpellPreparationSheetData<TActor extends CreaturePF2e> extends ActorSheetData<TActor> {
    owner: boolean;
    entry: SpellcastingSheetData;
}

export { SpellPreparationSheet };
