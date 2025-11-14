import type { LootPF2e } from "@actor";
import { transferItemsBetweenActors } from "@actor/helpers.ts";
import type { ActorSheetDataPF2e, InventoryItem, SheetInventory } from "@actor/sheet/data-types.ts";
import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { ActorSheetOptions } from "@client/appv1/sheets/actor-sheet.d.mts";
import type BaseActor from "@common/documents/actor.d.mts";
import type { ActorSchema } from "@common/documents/actor.d.mts";
import type { PhysicalItemPF2e } from "@item";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { htmlClosest, htmlQuery } from "@util";
import { ActorSheetPF2e } from "../sheet/base.ts";
import { DistributeCoinsDialog } from "../sheet/popups/distribute-coins-dialog.ts";
import { LootNPCsPopup } from "../sheet/popups/loot-npcs-popup.ts";
import type { LootSystemSchema } from "./data.ts";

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
        return `${SYSTEM_ROOT}/templates/actors/loot/sheet.hbs`;
    }

    override async getData(): Promise<LootSheetDataPF2e<TActor>> {
        const sheetData = await super.getData();
        const actor = this.actor;
        const isLoot = actor.system.lootSheetType === "Loot";
        const rollData = actor.getRollData();
        const description = sheetData.data.details.description;
        sheetData.enrichedContent.description = await TextEditorPF2e.enrichHTML(description, { rollData });
        return {
            ...sheetData,
            hasActiveParty: !!game.actors.party,
            isLoot,
            fields: (actor as BaseActor).schema.fields,
            systemFields: actor.system.schema.fields,
            lootSheetTypeOptions: [
                { value: "Loot", label: game.i18n.localize("PF2E.loot.LootLabel") },
                { value: "Merchant", label: game.i18n.localize("PF2E.loot.MerchantLabel") },
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
                new DistributeCoinsDialog({ actor: this.actor }).render(true);
            } else if (button?.dataset.action === "loot-npcs") {
                if (canvas.tokens.controlled.some((token) => token.actor?.id !== this.actor.id)) {
                    new LootNPCsPopup(this.actor).render(true);
                } else {
                    ui.notifications.warn("No tokens selected.");
                }
            } else if (button?.dataset.action === "send-to-party-stash") {
                if (!game.actors.party) return;
                transferItemsBetweenActors(this.actor, game.actors.party);
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
    hasActiveParty: boolean;
    isLoot: boolean;
    fields: ActorSchema;
    systemFields: LootSystemSchema;
    lootSheetTypeOptions: FormSelectOption[];
}
