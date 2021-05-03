import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data/types';

/** Convert heritage "feats" be of type "heritage" */
export class Migration610SetHeritageFeatType extends MigrationBase {
    static version = 0.61;

    async updateItem(itemData: ItemDataPF2e) {
        const itemTraits: string[] = itemData.data.traits.value;
        if (itemData.type === 'feat' && itemTraits.includes('heritage')) {
            itemData.data.featType.value = 'heritage';
            const index = itemTraits.indexOf('heritage');
            itemTraits.splice(index, 1);
        }
    }
}
