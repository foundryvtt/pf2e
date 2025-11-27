import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { Coins } from "@item/physical/coins.ts";
import type { PhysicalSystemSource } from "@item/physical/data.ts";
import type { CoinDenomination } from "@item/physical/types.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

export class Migration746StandardizePricing extends MigrationBase {
    static override version = 0.746;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!itemIsOfType(source, "physical") || itemIsOfType(source, "treasure", "kit")) return;

        const system: PhysicalSystemMaybeOld = source.system;
        if (R.isPlainObject(system.price) && typeof system.price.value === "string") {
            system.price.value = Coins.fromString(String(system.price.value)).toObject();
        }
    }
}

interface PhysicalSystemMaybeOld extends Omit<PhysicalSystemSource, "price"> {
    price:
        | string
        | {
              value: number | Partial<Record<CoinDenomination, number>>;
              per?: number;
          };
}
