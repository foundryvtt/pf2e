import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical";
import { createSheetTags, SheetOptions } from "@module/sheet/helpers";
import { EquipmentPF2e } from ".";

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
