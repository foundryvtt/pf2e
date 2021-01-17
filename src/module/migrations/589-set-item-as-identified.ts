import { isPhysicalItem } from '../item/dataDefinitions';
import { MigrationBase } from './base';

export class Migration589SetItemAsIdentified extends MigrationBase {
    version = 0.589;
    async updateItem(item: any) {
        if (isPhysicalItem(item)) {
            item.data.identified = { value: true };
        }
    }
}
