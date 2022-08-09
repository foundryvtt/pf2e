import { PhysicalItemSheetPF2e } from "@item/physical/sheet";
import { PhysicalItemSheetData } from "@item/sheet/data-types";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers";
import { ContainerPF2e } from ".";

export class ContainerSheetPF2e extends PhysicalItemSheetPF2e<ContainerPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ContainerSheetData> {
        return {
            ...(await super.getData(options)),
            hasSidebar: true,
            hasDetails: true,
            bulkTypes: CONFIG.PF2E.bulkTypes,
            traits: createSheetTags(CONFIG.PF2E.equipmentTraits, this.item.system.traits),
        };
    }
}

interface ContainerSheetData extends PhysicalItemSheetData<ContainerPF2e> {
    bulkTypes: ConfigPF2e["PF2E"]["bulkTypes"];
    traits: SheetOptions;
}
