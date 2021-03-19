import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data-definitions';
import { ActorDataPF2e } from '@actor/data-definitions';

/** Convert damageRolls arrays to objects. */
export class Migration607MeleeItemDamageRolls extends MigrationBase {
    static version = 0.607;

    async updateItem(itemData: ItemDataPF2e, _actorData: ActorDataPF2e) {
        if (itemData.type === 'melee') {
            if (Array.isArray(itemData.data.damageRolls)) {
                const damageRolls: Record<string, any> = {};
                itemData.data.damageRolls.forEach((roll) => {
                    const key =
                        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                    damageRolls[key] = roll;
                });
                itemData.data.damageRolls = damageRolls;
            }
        }
    }
}
