import type { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import type { TreasureSystemSchema } from "./data.ts";
import type { TreasurePF2e } from "./document.ts";
import type { TreasureCategory } from "./types.ts";
import { TREASURE_CATEGORIES } from "./values.ts";

export class TreasureSheetPF2e extends PhysicalItemSheetPF2e<TreasurePF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<TreasureSheetData> {
        const data = await super.getData(options);
        const coinSlugs = ["copper-pieces", "silver-pieces", "gold-pieces", "platinum-pieces"];
        const categories = TREASURE_CATEGORIES.map((c) => ({
            value: c,
            label: _loc(`PF2E.Item.Treasure.FIELDS.category.choices.${c}`),
            disabled: (c === "coin") !== coinSlugs.includes(this.item.slug ?? ""),
        })).sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.label.localeCompare(b.label, game.i18n.lang));

        // Always render the price of credsticks as if it were sf2e, even in pf2e
        if (this.item.system.category === "credstick") {
            data.price.label = this.item.system.price.value.toString({ short: true, unit: "credits" });
        }

        return Object.assign(data, {
            categories,
            currencies: CONFIG.PF2E.currencies,
            systemFields: this.item.system.schema.fields,
        });
    }
}

interface TreasureSheetData extends PhysicalItemSheetData<TreasurePF2e> {
    currencies: ConfigPF2e["PF2E"]["currencies"];
    categories: { value: TreasureCategory; label: string; disabled: boolean }[];
    systemFields: TreasureSystemSchema;
}
