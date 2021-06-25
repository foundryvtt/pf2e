import { MigrationBase } from '../base';
import { ItemSourcePF2e } from '@item/data';

/** Remove "instinct" trait from feats */
export class Migration615RemoveInstinctTrait extends MigrationBase {
    static override version = 0.615;

    override async updateItem(itemData: ItemSourcePF2e) {
        const traits: { value: string[] } = itemData.data.traits;
        if (typeof traits.value === 'string') {
            // Catch trait.value properties that missed migration 597
            traits.value = [];
        } else {
            traits.value = traits.value.filter((trait) => trait !== 'instinct');
        }
    }
}
