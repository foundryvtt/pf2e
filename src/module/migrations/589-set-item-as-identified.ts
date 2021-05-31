import type { ItemSourcePF2e } from '@item/data';
import { isPhysicalData } from '@item/data/helpers';
import type { PhysicalSystemData } from '@item/physical/data';
import { MigrationBase } from './base';

export class Migration589SetItemAsIdentified extends MigrationBase {
    static version = 0.589;
    async updateItem(item: ItemSourcePF2e) {
        if (isPhysicalData(item)) {
            const systemData: PhysicalSystemData & { identified?: { value: boolean } } = item.data;
            systemData.identified = { value: true };
        }
    }
}
