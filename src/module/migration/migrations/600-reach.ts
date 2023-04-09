import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";

export class Migration600Reach extends MigrationBase {
    static override version = 0.6;

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
        if (item.type === "ancestry") {
            item.system.reach = 5;
        }
    }
}
