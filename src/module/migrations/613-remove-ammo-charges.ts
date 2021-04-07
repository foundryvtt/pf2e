import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data-definitions';
import { ActorDataPF2e } from '@actor/data-definitions';

/** Remove charges from ammunition to ensure ammo consumption works properly. */
export class Migration613RemoveAmmoCharges extends MigrationBase {
    static version = 0.613;

    async updateItem(itemData: ItemDataPF2e, _actorData: ActorDataPF2e) {
        if (itemData.type === 'consumable' && itemData.data.consumableType.value === 'ammo') {
            itemData.data.charges.value = 0;
            itemData.data.charges.max = 0;
        }
    }
}
