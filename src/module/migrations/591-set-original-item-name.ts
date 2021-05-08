import { isPhysicalItem, ItemDataPF2e, ItemDescriptionData, PhysicalDetailsData } from '@item/data/types';
import { MigrationBase } from './base';

export class Migration591SetOriginalItemName extends MigrationBase {
    static version = 0.591;
    async updateItem(item: ItemDataPF2e) {
        const systemData: ItemDescriptionData & { identified?: { value: boolean } } = item.data;
        if (isPhysicalItem(item) && !(systemData.identified?.value ?? true)) {
            const data: PhysicalDetailsData & { originalName?: string } = item.data;
            data.originalName = item.name;
            item.name = 'Unidentified Item';
        }
    }
}
