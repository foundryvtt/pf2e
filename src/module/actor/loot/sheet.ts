import type { LootPF2e } from "@actor";
import type { ActorSheetDataPF2e, InventoryItem, SheetInventory } from "@actor/sheet/data-types.ts";
import type { PhysicalItemPF2e } from "@item";
import { htmlClosest, htmlQuery } from "@util";
import { ActorSheetPF2e } from "../sheet/base.ts";
import { DistributeCoinsPopup } from "../sheet/popups/distribute-coins-popup.ts";
import { LootNPCsPopup } from "../sheet/popups/loot-npcs-popup.ts";

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
        });

        return {
            ...sheetData,
            hasActiveParty: !!game.actors.party,
            isLoot,
            lootSheetTypeOptions: [
                { value: "Loot", label: "PF2E.loot.LootLabel" },
                { value: "Merchant", label: "PF2E.loot.MerchantLabel" },
            ],
        };
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
            } else if (button?.dataset.action === "to-party-stash") {
                this.transferToPartyStash();
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

    private async transferToPartyStash(): Promise<void> {
        const activeParty = game.actors.party;

        if (!activeParty) return;

        const newItems: PhysicalItemPF2e[] = [];
        const itemUpdates = new Map<string, number>();
        const itemsToDelete: string[] = [];

        for (const item of this.actor.inventory) {
            const stackableItem = activeParty.inventory.findStackableItem(item);
            if (stackableItem) {
                const currentQuantity = itemUpdates.get(stackableItem.id) ?? stackableItem.quantity;
                itemUpdates.set(stackableItem.id, currentQuantity + item.quantity);
                continue;
            }
            newItems.push(item);
        }

        itemsToDelete.push(...this.actor.inventory.map((item) => item.id));

        if (newItems.length > 0) {
            const stacked = newItems.reduce((result: PhysicalItemPF2e[], item) => {
                const stackableItem = result.find((i) => i.isStackableWith(item));
                if (stackableItem) {
                    stackableItem.updateSource({
                        system: {
                            quantity: stackableItem.quantity + item.quantity,
                        },
                    });
                    return result;
                }
                result.push(item);
                return result;
            }, []);
            const sources = stacked.map((i) => i.toObject());
            await activeParty.createEmbeddedDocuments("Item", sources, {
                render: itemUpdates.size === 0,
            });
        }

        if (itemUpdates.size > 0) {
            const updates = [...itemUpdates.entries()].map(([id, quantity]) => ({
                _id: id,
                system: {
                    quantity,
                },
            }));
            await activeParty.updateEmbeddedDocuments("Item", updates);
        }

        if (itemsToDelete.length > 0) {
            await this.actor.deleteEmbeddedDocuments("Item", itemsToDelete);
        }
    }
}

interface LootSheetDataPF2e<TActor extends LootPF2e> extends ActorSheetDataPF2e<TActor> {
    hasActiveParty: boolean;
    isLoot: boolean;
    lootSheetTypeOptions: FormSelectOption[];
}
