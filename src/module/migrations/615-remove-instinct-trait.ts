import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data-definitions';

/** Numify melee bonus.value property */
export class Migration615RemoveInstinctTrait extends MigrationBase {
    static version = 0.615;

    async updateItem(itemData: ItemDataPF2e) {
        itemData.data.traits.value.filter((trait) => trait !== 'instinct');
    }
}
