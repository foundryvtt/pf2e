import { ActorSheetPF2e } from "../sheet/base";
import { VehiclePF2e } from "@actor/vehicle";
import { ItemDataPF2e } from "@item/data";
import { tupleHasValue } from "@util";
import { VehicleSheetData } from "./data";

export class VehicleSheetPF2e extends ActorSheetPF2e<VehiclePF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        return {
            ...options,
            classes: [...options.classes, "vehicle"],
            width: 670,
            height: 480,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "details" }],
        };
    }

    override get template(): string {
        return "systems/pf2e/templates/actors/vehicle/vehicle-sheet.html";
    }

    override async getData(): Promise<VehicleSheetData> {
        const sheetData = (await super.getData()) as VehicleSheetData;

        sheetData.actorSizes = CONFIG.PF2E.actorSizes;
        sheetData.actorSize = sheetData.actorSizes[sheetData.data.traits.size.value];

        sheetData.actorRarities = CONFIG.PF2E.rarityTraits;
        sheetData.actorRarity = sheetData.actorRarities[sheetData.data.traits.rarity];

        return sheetData;
    }

    override async prepareItems(sheetData: VehicleSheetData): Promise<void> {
        const actorData = sheetData.actor;

        // Actions
        const actions: Record<"action" | "reaction" | "free", { label: string; actions: ItemDataPF2e[] }> = {
            action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
        };

        for (const itemData of actorData.items) {
            const item = this.actor.items.get(itemData._id, { strict: true });
            if (item.isOfType("physical")) {
                const systemData = item.system;
                itemData.showEdit = sheetData.user.isGM || systemData.identification.status === "identified";
                itemData.isInvestable = false;
                itemData.isIdentified = systemData.identification.status === "identified";
                itemData.assetValue = item.assetValue;
                itemData.showEdit = true;
            }

            // Actions
            if (itemData.type === "action") {
                const actionTypes = ["free", "reaction", "passive"] as const;
                const fromItem: string = itemData.system.actionType.value;
                const actionType = tupleHasValue(actionTypes, fromItem) ? fromItem : "action";
                itemData.img = VehiclePF2e.getActionGraphics(
                    actionType,
                    parseInt((itemData.system.actions || {}).value, 10) || 1
                ).imageUrl;
                if (actionType === "passive") {
                    actions.free.actions.push(itemData);
                } else {
                    actions[actionType].actions.push(itemData);
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
        $html.find(".crb-tag-selector").on("click", (event) => this.onTraitSelector(event));
    }
}
