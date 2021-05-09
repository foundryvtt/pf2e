import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data/types';

export class Migration600Reach extends MigrationBase {
    static version = 0.6;

    async updateItem(item: ItemDataPF2e) {
        if (item.type === 'ancestry') {
            item.data.reach = 5;
        }
    }
}
