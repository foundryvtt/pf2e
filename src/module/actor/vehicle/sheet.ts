import { calculateBulk, formatBulk, indexBulkItemsById, itemsFromActorData } from "@item/physical/bulk";
import { getContainerMap } from "@item/container/helpers";
import { ActorSheetPF2e } from "../sheet/base";
import { VehiclePF2e } from "@actor/vehicle";
import { ItemDataPF2e, PhysicalItemData } from "@item/data";
import { PhysicalItemType } from "@item/physical/data";
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
        // Inventory
        const inventory: Record<Exclude<PhysicalItemType, "book">, { label: string; items: PhysicalItemData[] }> = {
            weapon: { label: game.i18n.localize("PF2E.InventoryWeaponsHeader"), items: [] },
            armor: { label: game.i18n.localize("PF2E.InventoryArmorHeader"), items: [] },
            equipment: { label: game.i18n.localize("PF2E.InventoryEquipmentHeader"), items: [] },
            consumable: { label: game.i18n.localize("PF2E.InventoryConsumablesHeader"), items: [] },
            treasure: { label: game.i18n.localize("PF2E.InventoryTreasureHeader"), items: [] },
            backpack: { label: game.i18n.localize("PF2E.InventoryBackpackHeader"), items: [] },
        };

        // Actions
        const actions: Record<string, { label: string; actions: any }> = {
            action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
        };

        // Iterate through items, allocating to containers
        const bulkItems = itemsFromActorData(actorData);
        const bulkItemsById = indexBulkItemsById(bulkItems);
        const containers = getContainerMap({
            items: actorData.items.filter((itemData: ItemDataPF2e) => isPhysicalData(itemData)),
            bulkItemsById,
            actorSize: actorData.data.traits.size.value,
        });

        for (const itemData of actorData.items) {
            const physicalData: ItemDataPF2e = itemData;
            const item = this.actor.items.get(itemData._id, { strict: true });
            if (item instanceof PhysicalItemPF2e && isPhysicalData(physicalData)) {
                itemData.showEdit = sheetData.user.isGM || physicalData.data.identification.status === "identified";
                itemData.img ||= CONST.DEFAULT_TOKEN;

                const containerData = containers.get(itemData._id)!;
                itemData.containerData = containerData;
                itemData.isInContainer = containerData.isInContainer;
                itemData.isInvestable = false;
                itemData.isIdentified = physicalData.data.identification.status === "identified";
                itemData.assetValue = item.assetValue;

                // Inventory
                if (Object.keys(inventory).includes(itemData.type)) {
                    itemData.data.quantity = physicalData.data.quantity || 0;
                    itemData.data.weight.value = physicalData.data.weight.value || 0;
                    const bulkItem = bulkItemsById.get(physicalData._id);
                    const [approximatedBulk] = calculateBulk({
                        items: bulkItem === undefined ? [] : [bulkItem],
                        actorSize: this.actor.data.data.traits.size.value,
                    });
                    itemData.totalWeight = formatBulk(approximatedBulk);
                    itemData.hasCharges = physicalData.type === "consumable" && physicalData.data.charges.max > 0;
                    if (physicalData.type === "book") {
                        inventory.equipment.items.push(itemData);
                    } else {
                        inventory[physicalData.type].items.push(itemData);
                    }
                }
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

        actorData.inventory = inventory;
        // actorData.attacks = attacks;
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
