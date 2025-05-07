import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import type { AugmentationPF2e } from "./document.ts";

export class AugmentationSheetPF2e extends PhysicalItemSheetPF2e<AugmentationPF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<PhysicalItemSheetData<AugmentationPF2e>> {
        const sheetData = await super.getData(options);

        return {
            ...sheetData,
            itemType: game.i18n.localize("TYPES.Item.augmentation"),
            sidebarTemplate: "systems/pf2e/templates/items/augmentation-sidebar.hbs",
        };
    }
}
