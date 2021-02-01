import { MigrationBase } from './base';
import { ItemData } from '@item/dataDefinitions';

export class Migration600Reach extends MigrationBase {
    static version = 0.6;

    async updateItem(item: ItemData) {
        if (item.type === 'ancestry') {
            item.data.reach = 5;
        }
    }
}
