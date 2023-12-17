import type { ActorPF2e, LootPF2e } from "@actor";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import type { ItemPF2e } from "@item";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
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

    override get isLootSheet(): boolean {
        return !this.actor.isOwner && this.actor.isLootableBy(game.user);
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

    protected override async _onDropItem(
        event: DragEvent,
        itemData: DropCanvasItemDataPF2e,
    ): Promise<ItemPF2e<ActorPF2e | null>[]> {
        // Prevent a Foundry permissions error from being thrown when a player drops an item from an unowned
        // loot sheet to the same sheet
        if (this.actor.id === itemData.actorId && !this.actor.testUserPermission(game.user, "OWNER")) {
            return [];
        }
        return super._onDropItem(event, itemData);
    }
}

interface LootSheetDataPF2e<TActor extends LootPF2e> extends ActorSheetDataPF2e<TActor> {
    isLoot: boolean;
}
