import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import * as R from "remeda";
import type { TreasurePF2e } from "./document.ts";

export class TreasureSheetPF2e extends PhysicalItemSheetPF2e<TreasurePF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<TreasureSheetData> {
        return {
            ...(await super.getData(options)),
            currencies: CONFIG.PF2E.currencies,
            stackGroups: R.pick(CONFIG.PF2E.stackGroups, ["coins", "gems"]),
        };
    }

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        if (formData["system.stackGroup"] === "") {
            formData["system.stackGroup"] = null;
        }

        return super._updateObject(event, formData);
    }
}

interface TreasureSheetData extends PhysicalItemSheetData<TreasurePF2e> {
    currencies: ConfigPF2e["PF2E"]["currencies"];
    stackGroups: Pick<typeof CONFIG.PF2E.stackGroups, "coins" | "gems">;
}
