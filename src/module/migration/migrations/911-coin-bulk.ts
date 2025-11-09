import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Fix bulk of coins */
export class Migration911CoinBulk extends MigrationBase {
    static override version = 0.911;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "treasure" && source.system.category === "coin") {
            source.system.bulk.value = 1;
        }
    }
}
