import { ItemSourcePF2e } from "@item/data/index.ts";
import { isPhysicalData } from "@item/data/helpers.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { MigrationBase } from "../base.ts";

export class Migration750FixCorruptedPrice extends MigrationBase {
    static override version = 0.75;

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
        if (!isPhysicalData(item) && item.type !== "kit") return;

        if (typeof item.system.price === "string") {
            item.system.price = { value: CoinsPF2e.fromString(item.system.price).toObject() };
        }
    }
}
