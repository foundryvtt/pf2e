import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data/types';

/** Remove charges from ammunition to ensure ammo consumption works properly. */
export class Migration613RemoveAmmoCharges extends MigrationBase {
    static version = 0.613;

    async updateItem(itemData: ItemDataPF2e) {
        if (itemData.type === 'consumable' && itemData.data.consumableType.value === 'ammo') {
            itemData.data.charges.value = 0;
            itemData.data.charges.max = 0;
        }
    }
}
