import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";

/** Numify melee bonus.value property */
export class Migration614NumifyMeleeBonuses extends MigrationBase {
    static override version = 0.614;

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type === "melee") {
            itemData.system.bonus = { value: Number(itemData.system.bonus.value) };
        }
    }
}
