import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import type { EquipmentPF2e } from "./document.ts";

export class EquipmentSheetPF2e extends PhysicalItemSheetPF2e<EquipmentPF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<EquipmentSheetData> {
        const item = this.item;
        const sheetData = await super.getData(options);
        const category = item.system.usage.type === "installed" ? "upgrade" : null;
        const otherTags = { ...CONFIG.PF2E.otherArmorTags, ...CONFIG.PF2E.otherEquipmentTags };
        return {
            ...sheetData,
            itemType: category ? _loc(`PF2E.Item.Equipment.Category.${category}`) : sheetData.itemType,
            otherTags: createSheetTags(otherTags, item.system.traits.otherTags),
        };
    }
}

interface EquipmentSheetData extends PhysicalItemSheetData<EquipmentPF2e> {
    otherTags: SheetOptions;
}
