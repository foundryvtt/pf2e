import { isPhysicalItem, ItemDataPF2e, ItemDescriptionData } from '@item/data/types';
import { MigrationBase } from './base';

export class Migration591SetOriginalItemName extends MigrationBase {
    static version = 0.591;
    async updateItem(item: ItemDataPF2e) {
        const systemData: ItemDescriptionData & { identified?: { value: boolean } } = item.data;
        if (isPhysicalItem(item) && !(systemData.identified?.value ?? true)) {
            item.data.originalName = item.name;
            item.name = 'Unidentified Item';
        }
    }
}
