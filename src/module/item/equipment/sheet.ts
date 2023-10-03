import { AttributeString } from "@actor/types.ts";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import { EquipmentPF2e } from "./document.ts";

export class EquipmentSheetPF2e extends PhysicalItemSheetPF2e<EquipmentPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<EquipmentSheetData> {
        const item = this.item;
        const sheetData = await super.getData(options);

        return {
            ...sheetData,
            isApex: item._source.system.traits.value.includes("apex"),
            attributes: CONFIG.PF2E.abilities,
            otherTags: createSheetTags(CONFIG.PF2E.otherArmorTags, item.system.traits.otherTags),
        };
    }
}

interface EquipmentSheetData extends PhysicalItemSheetData<EquipmentPF2e> {
    isApex: boolean;
    attributes: Record<AttributeString, string>;
    otherTags: SheetOptions;
}
