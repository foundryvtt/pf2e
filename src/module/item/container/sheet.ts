import { ItemSheetOptions } from "@item/base/sheet/base.ts";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import * as R from "remeda";
import type { ContainerPF2e } from "./document.ts";

export class ContainerSheetPF2e extends PhysicalItemSheetPF2e<ContainerPF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<ContainerSheetData> {
        return {
            ...(await super.getData(options)),
            stackGroups: R.pick(CONFIG.PF2E.stackGroups, ["sacks"]),
        };
    }
}

interface ContainerSheetData extends PhysicalItemSheetData<ContainerPF2e> {
    stackGroups: { sacks: string };
}
