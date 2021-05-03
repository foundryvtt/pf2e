import { MigrationBase } from './base';
import { isPhysicalItem } from '@item/data/types';

export class Migration595AddItemSize extends MigrationBase {
    static version = 0.595;

    async updateItem(item: any) {
        if (isPhysicalItem(item) && !('size' in item.data && 'value' in item.data.size)) {
            item.data.size = {
                value: 'med',
            };
        }
    }
}
