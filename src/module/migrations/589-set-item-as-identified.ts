import { isPhysicalItem, ItemDataPF2e, PhysicalDetailsData } from '@item/data-definitions';
import { MigrationBase } from './base';

export class Migration589SetItemAsIdentified extends MigrationBase {
    static version = 0.589;
    async updateItem(item: ItemDataPF2e) {
        if (isPhysicalItem(item)) {
            const systemData: PhysicalDetailsData & { identified?: { value: boolean } } = item.data;
            systemData.identified = { value: true };
        }
    }
}
