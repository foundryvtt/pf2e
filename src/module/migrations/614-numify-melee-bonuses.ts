import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data/types';

/** Numify melee bonus.value property */
export class Migration614NumifyMeleeBonuses extends MigrationBase {
    static version = 0.614;

    async updateItem(itemData: ItemDataPF2e) {
        if (itemData.type === 'melee') {
            itemData.data.bonus = { value: Number(itemData.data.bonus.value) };
        }
    }
}
