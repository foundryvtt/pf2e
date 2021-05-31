import { MigrationBase } from './base';
import { ItemSourcePF2e } from '@item/data';

/** Convert damageRolls arrays to objects. */
export class Migration607MeleeItemDamageRolls extends MigrationBase {
    static version = 0.607;

    async updateItem(itemData: ItemSourcePF2e) {
        if (itemData.type === 'melee') {
            if (Array.isArray(itemData.data.damageRolls)) {
                const damageRolls: Record<string, any> = {};
                itemData.data.damageRolls.forEach((roll) => {
                    const key = randomID(20);
                    damageRolls[key] = roll;
                });
                itemData.data.damageRolls = damageRolls;
            }
        }
    }
}
