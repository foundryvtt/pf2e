import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import { createSheetTags, SheetOptions } from "@module/sheet/helpers.ts";
import { EquipmentPF2e } from "./document.ts";

export class EquipmentSheetPF2e extends PhysicalItemSheetPF2e<EquipmentPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<EquipmentSheetData> {
        const item = this.item;
        const sheetData = await super.getData(options);
        return {
            ...sheetData,
            hasDetails: true,
            hasSidebar: true,
            otherTags: createSheetTags(CONFIG.PF2E.otherArmorTags, item.system.traits.otherTags),
        };
    }
}

interface EquipmentSheetData extends PhysicalItemSheetData<EquipmentPF2e> {
    bulkTypes: ConfigPF2e["PF2E"]["bulkTypes"];
    otherTags: SheetOptions;
}
