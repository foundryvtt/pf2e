import { ActorPF2e } from "@actor";
import { ItemSummaryRenderer } from "@actor/sheet/item-summary-renderer";
import { ItemPF2e, SpellPF2e } from "@item";
import { ItemSourcePF2e, SpellSource } from "@item/data";
import { SpellcastingAbilityData } from "@item/spellcasting-entry/data";
import { SpellcastingEntryPF2e } from "../../item/spellcasting-entry";

/**
 * Sheet used to render the the spell list for prepared casting.
 * It overrides the actor sheet to inherit important drag/drop behavior for actor items (the spells).
 */
class SpellPreparationSheet extends ActorSheet<ActorPF2e, ItemPF2e> {
    /** Implementation used to handle the toggling and rendering of item summaries */
    itemRenderer: ItemSummaryRenderer<ActorPF2e> = new ItemSummaryRenderer(this);

    constructor(public item: Embedded<SpellcastingEntryPF2e>, options: Partial<ActorSheetOptions>) {
        super(item.actor, options);
    }

    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        options.classes = ["default", "sheet", "spellcasting-entry", "preparation"];
        options.width = 480;
        options.height = 600;
        options.template = "systems/pf2e/templates/actors/spellcasting-prep-sheet.hbs";
        options.scrollY = [".sheet-content"];
        return options;
    }

    /** Avoid conflicting with the real actor sheet */
    override get id(): string {
        return `${super.id}-spellprep-${this.item.id}`;
    }

    override get title() {
        return game.i18n.format("PF2E.Actor.Creature.SpellPreparation.Title", { actor: this.actor.name });
    }

    /**
     * This being an actor sheet saves us from most drag and drop re-implementation,
     * but we still have a gotcha in the form of the header buttons.
     * Reimplement to avoid sheet configuration and token options.
     */
    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = [
            {
                label: "Close",
                class: "close",
                icon: "fas fa-times",
                onclick: () => this.close(),
            },
        ];
        return buttons;
    }

    override async getData(): Promise<SpellPreparationSheetData> {
        return {
            ...(await super.getData()),
            owner: this.actor.isOwner,
            entry: await this.item.getSpellData(),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        this.itemRenderer.activateListeners($html);

        // Update an embedded item
        $html.find(".item-edit").on("click", (event) => {
            const item = this.getItemFromEvent(event);
            if (item) {
                item.sheet.render(true);
            }
        });

        // Delete Inventory Item
        $html.find(".item-delete").on("click", (event) => {
            this.getItemFromEvent(event)?.delete();
        });

        // Item Rolling
        $html.find(".item[data-item-id] .item-image").on("click", (event) => {
            this.getItemFromEvent(event)?.toChat(event);
        });

        // Flexible Casting toggle
        $html.find(".toggle-signature-spell").on("click", (event) => {
            const item = this.getItemFromEvent(event);
            if (item instanceof SpellPF2e) {
                item.update({ "system.location.signature": !item.system.location.signature });
            }
        });

        $html.find(".spell-create").on("click", (event) => {
            const data = duplicate(event.currentTarget.dataset);
            const level = Number(data.level ?? 1);
            const newLabel = game.i18n.localize("PF2E.NewLabel");
            const levelLabel = game.i18n.localize(`PF2E.SpellLevel${level}`);
            const spellLabel = level > 0 ? game.i18n.localize("PF2E.SpellLabel") : "";
            data.name = `${newLabel} ${levelLabel} ${spellLabel}`;
            mergeObject(data, {
                "system.level.value": level,
                "system.location.value": this.item.id,
            });

            this.actor.createEmbeddedDocuments("Item", [data]);
        });

        $html.find(".spell-browse").on("click", (event) => {
            const level = Number($(event.currentTarget).attr("data-level")) ?? null;
            game.pf2e.compendiumBrowser.openSpellTab(this.item, level);
        });
    }

    private getItemFromEvent(event: JQuery.TriggeredEvent): Embedded<ItemPF2e> {
        const $li = $(event.currentTarget).closest("li[data-item-id]");
        const itemId = $li.attr("data-item-id") ?? "";
        return this.actor.items.get(itemId, { strict: true });
    }

    /** Allow adding new spells to the shortlist by dragging directly into the window */
    protected override async _onDropItemCreate(itemSource: ItemSourcePF2e | ItemSourcePF2e[]): Promise<ItemPF2e[]> {
        const sources = Array.isArray(itemSource) ? itemSource : [itemSource];
        const spellSources = sources.filter((source): source is SpellSource => source.type === "spell");
        for (const spellSource of spellSources) {
            spellSource.system.location.value = this.item.id;
        }

        return super._onDropItemCreate(spellSources);
    }

    /** Allow transferring spells between open windows */
    protected override async _onSortItem(event: ElementDragEvent, itemData: ItemSourcePF2e): Promise<ItemPF2e[]> {
        if (itemData.type !== "spell") return [];

        const spell = this.actor.items.get(itemData._id);
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

interface SpellPreparationSheetData extends ActorSheetData<ActorPF2e> {
    actor: ActorPF2e;
    owner: boolean;
    entry: SpellcastingAbilityData;
}

export { SpellPreparationSheet };
