import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { Coins } from "@item/physical/helpers.ts";
import { MigrationBase } from "../base.ts";

export class Migration750FixCorruptedPrice extends MigrationBase {
    static override version = 0.75;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!itemIsOfType(source, "physical") && source.type !== "kit") return;

        if (typeof source.system.price === "string") {
            source.system.price = { value: Coins.fromString(source.system.price).toObject() };
        }
    }
}
