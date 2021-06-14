import { MigrationBase } from '../base';
import { ItemSourcePF2e } from '@item/data';

/** Numify melee bonus.value property */
export class Migration614NumifyMeleeBonuses extends MigrationBase {
    static override version = 0.614;

    override async updateItem(itemData: ItemSourcePF2e) {
        if (itemData.type === 'melee') {
            itemData.data.bonus = { value: Number(itemData.data.bonus.value) };
        }
    }
}
