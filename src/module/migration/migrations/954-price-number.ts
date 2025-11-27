import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { Coins } from "@item/physical/coins.ts";
import { RawCoins } from "@item/physical/data.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

export class Migration954PriceNumber extends MigrationBase {
    static override version = 0.954;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (itemIsOfType(source, "treasure", "kit") && "game" in globalThis) return;
        if (!itemIsOfType(source, "physical") && source.type !== "kit") return;

        const price: PriceMaybeOld = source.system.price;
        if (R.isPlainObject(price.value)) {
            price.value = new Coins(price.value).value;
        }
    }
}

interface PriceMaybeOld {
    value: RawCoins | number;
    per?: number;
}
