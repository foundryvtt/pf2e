import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";

/** Fix spelling of the "talisman" `consumableType` */
export class Migration630FixTalismanSpelling extends MigrationBase {
    static override version = 0.63;

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type === "consumable") {
            const consumableType: { value: string } = itemData.system.consumableType;
            if (consumableType.value === "talasman") {
                consumableType.value = "talisman";
            }
        }
    }
}
