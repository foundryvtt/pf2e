import { MigrationBase } from './base';
import { isPhysicalItem } from '../item/dataDefinitions';

export class Migration595AddItemSize extends MigrationBase {
    static version = 0.595;

    async updateItem(item: any) {
        if (isPhysicalItem(item)) {
            item = item as any;
            item.data.size = {
                value: 'med',
            };
        }
    }
}
