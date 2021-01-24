import { isPhysicalItem } from '../item/dataDefinitions';
import { MigrationBase } from './base';

export class Migration591SetOriginalItemName extends MigrationBase {
    static version = 0.591;
    async updateItem(item: any) {
        if (isPhysicalItem(item) && !(item.data.identified.value ?? true)) {
            item.data.originalName = item.name;
            item.name = 'Unidentified Item';
        }
    }
}
