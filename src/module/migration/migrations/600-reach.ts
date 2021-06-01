import { MigrationBase } from '../base';
import { ItemSourcePF2e } from '@item/data';

export class Migration600Reach extends MigrationBase {
    static version = 0.6;

    async updateItem(item: ItemSourcePF2e) {
        if (item.type === 'ancestry') {
            item.data.reach = 5;
        }
    }
}
