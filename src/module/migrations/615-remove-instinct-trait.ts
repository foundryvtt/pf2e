import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data/types';

/** Remove "instinct" trait from feats */
export class Migration615RemoveInstinctTrait extends MigrationBase {
    static version = 0.615;

    async updateItem(itemData: ItemDataPF2e) {
        const traits: { value: string[] } = itemData.data.traits;
        if (typeof traits.value === 'string') {
            // Catch trait.value properties that missed migration 597
            traits.value = [];
        } else {
            traits.value = traits.value.filter((trait) => trait !== 'instinct');
        }
    }
}
