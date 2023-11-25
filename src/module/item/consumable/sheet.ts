import { ItemSheetOptions } from "@item/base/sheet/base.ts";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import * as R from "remeda";
import type { ConsumablePF2e } from "./document.ts";

export class ConsumableSheetPF2e extends PhysicalItemSheetPF2e<ConsumablePF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<ConsumableSheetData> {
        const sheetData = await super.getData(options);
        const item = this.item;

        return {
            ...sheetData,
            consumableTypes: CONFIG.PF2E.consumableTypes,
            materialEffects: createSheetTags(CONFIG.PF2E.materialDamageEffects, item.system.material.effects),
            stackGroups: R.omit(CONFIG.PF2E.stackGroups, ["coins", "gems", "sacks"]),
            otherTags: createSheetTags(CONFIG.PF2E.otherConsumableTags, item.system.traits.otherTags),
        };
    }
}

interface ConsumableSheetData extends PhysicalItemSheetData<ConsumablePF2e> {
    consumableTypes: ConfigPF2e["PF2E"]["consumableTypes"];
    materialEffects: SheetOptions;
    stackGroups: Omit<typeof CONFIG.PF2E.stackGroups, "coins" | "gems" | "sacks">;
    otherTags: SheetOptions;
}
