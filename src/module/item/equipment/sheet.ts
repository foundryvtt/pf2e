import { PhysicalItemSheetPF2e } from "@item/physical/sheet";
import { PhysicalItemSheetData } from "@item/sheet/data-types";
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
            traits: createSheetTags(CONFIG.PF2E.equipmentTraits, item.system.traits),
            otherTags: createSheetTags(CONFIG.PF2E.otherArmorTags, item.system.traits.otherTags),
        };
    }
}

interface EquipmentSheetData extends PhysicalItemSheetData<EquipmentPF2e> {
    bulkTypes: ConfigPF2e["PF2E"]["bulkTypes"];
    traits: SheetOptions;
    otherTags: SheetOptions;
}
