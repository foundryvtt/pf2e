import { MigrationBase } from "../base";
import { ItemSourcePF2e } from "@item/data";
import { ConsumableSystemData } from "@item/consumable/data";

interface ConsumableSystemDataOld extends ConsumableSystemData {
    charges?: {
        value: number;
        max: number;
    };
}

/** Remove charges from ammunition to ensure ammo consumption works properly. */
export class Migration613RemoveAmmoCharges extends MigrationBase {
    static override version = 0.613;

    override async updateItem(itemData: ItemSourcePF2e) {
        if (itemData.type !== "consumable") return;
        const data: ConsumableSystemDataOld = itemData.data;
        if (data.charges && data.consumableType.value === "ammo") {
            data.charges.value = 0;
            data.charges.max = 0;
        }
    }
}
