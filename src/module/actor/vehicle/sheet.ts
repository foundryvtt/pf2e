import { ActorSheetPF2e } from "../sheet/base";
import { VehiclePF2e } from "@actor/vehicle";
import { ItemDataPF2e } from "@item/data";
import { VehicleTrait } from "./data";
import { isPhysicalData } from "@item/data/helpers";
import { PhysicalItemPF2e } from "@item";

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

        // update properties
        sheetData.actorSizes = CONFIG.PF2E.actorSizes;
        sheetData.actorSize = sheetData.actorSizes[sheetData.data.traits.size.value];

        sheetData.actorRarities = CONFIG.PF2E.rarityTraits;
        sheetData.actorRarity = sheetData.actorRarities[sheetData.data.traits.rarity];
        sheetData.isNotCommon = sheetData.data.traits.rarity !== "common";

        // Update broken threshold
        if (sheetData.data.attributes !== undefined) {
            sheetData.data.attributes.hp.brokenThreshold = Math.floor(sheetData.data.attributes.hp.max / 2);
        }

        // Update save labels
        sheetData.data.saves.fortitude.label = CONFIG.PF2E.saves["fortitude"];
        sheetData.data.traits.traits.selected = sheetData.data.traits.traits.value.reduce(
            (traits: { [K in VehicleTrait]?: string }, trait: VehicleTrait) => ({
                ...traits,
                [trait]: CONFIG.PF2E.vehicleTraits[trait],
            }),
            {}
        );

        this.prepareItems(sheetData);

        return sheetData;
    }

    protected prepareItems(sheetData: any): void {
        const actorData = sheetData.actor;

        // Actions
        const actions: Record<string, { label: string; actions: any }> = {
            action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
        };

        for (const itemData of actorData.items) {
            const physicalData: ItemDataPF2e = itemData;
            const item = this.actor.items.get(itemData._id, { strict: true });
            if (item instanceof PhysicalItemPF2e && isPhysicalData(physicalData)) {
                itemData.showEdit = sheetData.user.isGM || physicalData.data.identification.status === "identified";
                itemData.img ||= CONST.DEFAULT_TOKEN;
                itemData.isInvestable = false;
                itemData.isIdentified = physicalData.data.identification.status === "identified";
                itemData.assetValue = item.assetValue;
            }

            // Actions
            if (itemData.type === "action") {
                const actionType = ["free", "reaction", "passive"].includes(itemData.data.actionType.value)
                    ? itemData.data.actionType.value
                    : "action";
                itemData.img = VehiclePF2e.getActionGraphics(
                    actionType,
                    parseInt((itemData.data.actions || {}).value, 10) || 1
                ).imageUrl;
                if (actionType === "passive") actions.free.actions.push(itemData);
                else actions[actionType].actions.push(itemData);
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
