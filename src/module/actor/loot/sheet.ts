import type { LootPF2e } from "@actor";
import type { ActorSheetDataPF2e, InventoryItem, SheetInventory } from "@actor/sheet/data-types.ts";
import type { PhysicalItemPF2e } from "@item";
import { htmlClosest, htmlQuery } from "@util";
import { ActorSheetPF2e } from "../sheet/base.ts";
import { LootNPCsPopup } from "../sheet/loot/loot-npcs-popup.ts";
import { DistributeCoinsPopup } from "../sheet/popups/distribute-coins-popup.ts";

export class LootSheetPF2e<TActor extends LootPF2e> extends ActorSheetPF2e<TActor> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;

        return {
            ...options,
            editable: true,
            classes: [...options.classes, "loot"],
            width: 650,
            height: 680,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "inventory" }],
        };
    }

    override get template(): string {
        return "systems/pf2e/templates/actors/loot/sheet.hbs";
    }

    override async getData(): Promise<LootSheetDataPF2e<TActor>> {
        const sheetData = await super.getData();
        const isLoot = this.actor.system.lootSheetType === "Loot";

        // Enrich content
        const rollData = this.actor.getRollData();
        sheetData.enrichedContent.description = await TextEditor.enrichHTML(sheetData.data.details.description, {
            rollData,
            async: true,
        });

        return { ...sheetData, isLoot };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        if (!this.isEditable) return;
        const html = $html[0];

        htmlQuery(html, "[data-sidebar-buttons]")?.addEventListener("click", (event) => {
            const button = htmlClosest(event.target, "button[data-action]");
            if (button?.dataset.action === "split-coins") {
                new DistributeCoinsPopup(this.actor).render(true);
            } else if (button?.dataset.action === "loot-npcs") {
                if (canvas.tokens.controlled.some((token) => token.actor?.id !== this.actor.id)) {
                    new LootNPCsPopup(this.actor).render(true);
                } else {
                    ui.notifications.warn("No tokens selected.");
                }
            }
        });
    }

    protected override prepareInventory(): SheetInventory {
        const preparedInventory = super.prepareInventory();
        preparedInventory.showUnitBulkPrice = this.actor.system.lootSheetType === "Merchant";

        // Hide empty sections for non-owners
        if (!this.actor.isOwner) {
            preparedInventory.sections = preparedInventory.sections.filter(
                (s) => s.items.length && s.items.some((i) => !i.hidden),
            );
        }

        return preparedInventory;
    }

    /** Hide coin item rows in merchant actors */
    protected override prepareInventoryItem(item: PhysicalItemPF2e): InventoryItem {
        const isMerchant = this.actor.system.lootSheetType === "Merchant";
        const data = super.prepareInventoryItem(item);
        data.hidden = isMerchant && item.isOfType("treasure") && item.isCoinage && !item.container;
        return data;
    }
}

interface LootSheetDataPF2e<TActor extends LootPF2e> extends ActorSheetDataPF2e<TActor> {
    isLoot: boolean;
}
