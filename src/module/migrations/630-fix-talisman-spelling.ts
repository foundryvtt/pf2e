import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data/types';

/** Fix spelling of the "talisman" `consumableType` */
export class Migration630FixTalismanSpelling extends MigrationBase {
    static version = 0.63;

    async updateItem(itemData: ItemDataPF2e) {
        if (itemData.type === 'consumable') {
            const consumableType: { value: string } = itemData.data.consumableType;
            if (consumableType.value === 'talasman') {
                consumableType.value = 'talisman';
            }
        }
    }
}
