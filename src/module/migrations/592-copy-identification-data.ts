import { isPhysicalItem } from '../item/dataDefinitions';
import { MigrationBase } from './base';

export class Migration592CopyIdentificationData extends MigrationBase {
    static version = 0.592;
    async updateItem(item: any) {
        if (isPhysicalItem(item)) {
            item = item as any;
            const unidentified = !item.data.identified?.value ?? false;
            const needsUpdate = !item.data.identification;
            if (needsUpdate && unidentified && item.data.originalName) {
                item.data.identification.status = 'unidentified';
                item.data.identification.identified.name = item.data.originalName;
            }
        }
    }
}
