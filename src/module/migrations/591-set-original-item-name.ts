import { ItemSourcePF2e } from '@item/data';
import { ItemSystemData } from '@item/data/base';
import { isPhysicalData } from '@item/data/helpers';
import { PhysicalSystemData } from '@item/physical/data';
import { MigrationBase } from './base';

export class Migration591SetOriginalItemName extends MigrationBase {
    static version = 0.591;
    async updateItem(item: ItemSourcePF2e) {
        const systemData: ItemSystemData & { identified?: { value: boolean } } = item.data;
        if (isPhysicalData(item) && !(systemData.identified?.value ?? true)) {
            const data: PhysicalSystemData & { originalName?: string } = item.data;
            data.originalName = item.name;
            item.name = 'Unidentified Item';
        }
    }
}
