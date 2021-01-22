import { MigrationBase } from './base';
import { isPhysicalItem } from '../item/dataDefinitions';

export class Migration594AddItemSize extends MigrationBase {
    version = 0.594;

    async updateItem(item: any) {
        if (isPhysicalItem(item)) {
            item = item as any;
            item.data.size = {
                value: 'med',
            };
        }
    }
}