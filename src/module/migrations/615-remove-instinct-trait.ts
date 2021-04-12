import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data-definitions';

/** Remove "instinct" trait from feats */
export class Migration615RemoveInstinctTrait extends MigrationBase {
    static version = 0.615;

    async updateItem(itemData: ItemDataPF2e) {
        itemData.data.traits.value = itemData.data.traits.value.filter((trait) => trait !== 'instinct');
    }
}
