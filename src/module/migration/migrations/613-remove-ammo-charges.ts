import { MigrationBase } from "../base";
import { ItemSourcePF2e } from "@item/data";

/** Remove charges from ammunition to ensure ammo consumption works properly. */
export class Migration613RemoveAmmoCharges extends MigrationBase {
    static override version = 0.613;

    override async updateItem(itemData: ItemSourcePF2e) {
        if (itemData.type === "consumable" && itemData.data.consumableType.value === "ammo") {
            itemData.data.charges.value = 0;
            itemData.data.charges.max = 0;
        }
    }
}
