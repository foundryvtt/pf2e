import type { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import { localizer } from "@util";
import * as R from "remeda";
import type { TreasureSystemSchema } from "./data.ts";
import type { TreasurePF2e } from "./document.ts";
import type { TreasureCategory } from "./types.ts";
import { TREASURE_CATEGORIES } from "./values.ts";

export class TreasureSheetPF2e extends PhysicalItemSheetPF2e<TreasurePF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<TreasureSheetData> {
        const localize = localizer("PF2E.Item.Treasure.FIELDS.category.choices");
        return Object.assign(await super.getData(options), {
            categories: R.mapToObj(TREASURE_CATEGORIES, (c) => [c, localize(c)]),
            currencies: CONFIG.PF2E.currencies,
            systemFields: this.item.system.schema.fields,
        });
    }
}

interface TreasureSheetData extends PhysicalItemSheetData<TreasurePF2e> {
    currencies: ConfigPF2e["PF2E"]["currencies"];
    categories: Record<TreasureCategory, string>;
    systemFields: TreasureSystemSchema;
}
