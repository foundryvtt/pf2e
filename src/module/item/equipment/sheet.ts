import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { PhysicalItemSheetPF2e, type PhysicalItemSheetData, type StaffSheetData } from "@item/physical/index.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import type { EquipmentPF2e } from "./document.ts";

export class EquipmentSheetPF2e extends PhysicalItemSheetPF2e<EquipmentPF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<EquipmentSheetData> {
        const item = this.item;
        const sheetData = await super.getData(options);

        return {
            ...sheetData,
            otherTags: createSheetTags(CONFIG.PF2E.otherArmorTags, item.system.traits.otherTags),
            staff: await this.prepareStaffSpells(this.item),
        };
    }
}

interface EquipmentSheetData extends PhysicalItemSheetData<EquipmentPF2e> {
    otherTags: SheetOptions;
    staff: StaffSheetData | null;
}
