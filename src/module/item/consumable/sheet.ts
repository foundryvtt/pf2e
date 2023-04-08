import { ConsumablePF2e } from "@item";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import { createSheetTags, SheetOptions } from "@module/sheet/helpers.ts";

export class ConsumableSheetPF2e extends PhysicalItemSheetPF2e<ConsumablePF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ConsumableSheetData> {
        const item = this.item;
        const sheetData = await super.getData(options);
        return {
            ...sheetData,
            hasDetails: true,
            hasSidebar: true,
            consumableTypes: CONFIG.PF2E.consumableTypes,
            otherTags: createSheetTags(CONFIG.PF2E.otherConsumableTags, item.system.traits.otherTags),
        };
    }
}

interface ConsumableSheetData extends PhysicalItemSheetData<ConsumablePF2e> {
    consumableTypes: ConfigPF2e["PF2E"]["consumableTypes"];
    otherTags: SheetOptions;
}
