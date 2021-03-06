import { ActorSheetPF2e } from "../sheet/base";
import { VehiclePF2e } from "@actor/vehicle";
import { ItemDataPF2e } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { PhysicalItemPF2e } from "@item";
import { tupleHasValue } from "@util";

export class VehicleSheetPF2e extends ActorSheetPF2e<VehiclePF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        return {
            ...super.defaultOptions,
            classes: ["default", "sheet", "actor", "vehicle"],
            width: 670,
            height: 480,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "details" }],
        };
    }

    override get template(): string {
        return "systems/pf2e/templates/actors/vehicle/vehicle-sheet.html";
    }

    override async getData() {
        const sheetData: any = await super.getData();

        sheetData.actorSizes = CONFIG.PF2E.actorSizes;
        sheetData.actorSize = sheetData.actorSizes[sheetData.data.traits.size.value];

        sheetData.actorRarities = CONFIG.PF2E.rarityTraits;
        sheetData.actorRarity = sheetData.actorRarities[sheetData.data.traits.rarity];

        this.prepareItems(sheetData);

        return sheetData;
    }

    protected prepareItems(sheetData: any): void {
        const actorData = sheetData.actor;

        // Actions
        const actions: Record<"action" | "reaction" | "free", { label: string; actions: ItemDataPF2e[] }> = {
            action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
        };

        for (const itemData of actorData.items) {
            const physicalData: ItemDataPF2e = itemData;
            const item = this.actor.items.get(itemData._id, { strict: true });
            if (item instanceof PhysicalItemPF2e && isPhysicalData(physicalData)) {
                itemData.showEdit = sheetData.user.isGM || physicalData.data.identification.status === "identified";
                itemData.isInvestable = false;
                itemData.isIdentified = physicalData.data.identification.status === "identified";
                itemData.assetValue = item.assetValue;
            }

            // Actions
            if (itemData.type === "action") {
                const actionTypes = ["free", "reaction", "passive"] as const;
                const fromItem: string = itemData.data.actionType.value;
                const actionType = tupleHasValue(actionTypes, fromItem) ? fromItem : "action";
                itemData.img = VehiclePF2e.getActionGraphics(
                    actionType,
                    parseInt((itemData.data.actions || {}).value, 10) || 1
                ).imageUrl;
                if (actionType === "passive") {
                    actions.free.actions.push(itemData);
                } else {
                    actions[actionType].actions.push(itemData);
                }
            }

            for (const itemData of sheetData.items) {
                const physicalData: ItemDataPF2e = itemData;
                if (isPhysicalData(physicalData)) {
                    itemData.showEdit = true;
                }
            }
        }

        actorData.actions = actions;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        {
            // ensure correct tab name is displayed after actor update
            const title = $(".sheet-navigation .active").attr("title");
            if (title) {
                $html.find(".navigation-title").text(title);
            }
        }
        $html.find(".sheet-navigation").on("mouseover", ".item", (event) => {
            const title = event.currentTarget.title;
            if (title) {
                $(event.currentTarget).parents(".sheet-navigation").find(".navigation-title").text(title);
            }
        });
        $html.find(".sheet-navigation").on("mouseout", ".item", (event) => {
            const parent = $(event.currentTarget).parents(".sheet-navigation");
            const title = parent.find(".item.active").attr("title");
            if (title) {
                parent.find(".navigation-title").text(title);
            }
        });

        // get buttons
        $html.find(".crb-trait-selector").on("click", (event) => this.onTraitSelector(event));
    }
}
