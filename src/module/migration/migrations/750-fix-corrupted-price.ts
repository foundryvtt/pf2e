import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { PhysicalSystemSource } from "@item/physical/data.ts";
import { Coins } from "@item/physical/helpers.ts";
import { CoinDenomination } from "@item/physical/types.ts";
import { MigrationBase } from "../base.ts";

export class Migration750FixCorruptedPrice extends MigrationBase {
    static override version = 0.75;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!itemIsOfType(source, "physical") || itemIsOfType(source, "treasure", "kit")) return;

        const system: PhysicalSystemMaybeOld = source.system;
        if (typeof system.price === "string") {
            system.price = { value: Coins.fromString(system.price).toObject() };
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
