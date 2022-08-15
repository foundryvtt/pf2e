import { PhysicalItemSheetPF2e } from "@item/physical/sheet";
import { PhysicalItemSheetData } from "@item/sheet/data-types";
import { ContainerPF2e } from ".";

export class ContainerSheetPF2e extends PhysicalItemSheetPF2e<ContainerPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<PhysicalItemSheetData<ContainerPF2e>> {
        return {
            ...(await super.getData(options)),
            hasSidebar: true,
            hasDetails: true,
        };
    }
}
