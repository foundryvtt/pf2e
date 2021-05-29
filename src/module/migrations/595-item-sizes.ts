import { ItemSourcePF2e } from '@item/data';
import { isPhysicalData } from '@item/data/helpers';
import { MigrationBase } from './base';

export class Migration595AddItemSize extends MigrationBase {
    static version = 0.595;

    async updateItem(item: ItemSourcePF2e) {
        if (isPhysicalData(item) && !('size' in item.data && 'value' in item.data.size)) {
            item.data.size = {
                value: 'med',
            };
        }
    }
}
