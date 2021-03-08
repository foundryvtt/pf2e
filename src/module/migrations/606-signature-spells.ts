import { ItemData } from '@item/data-definitions';
import { MigrationBase } from './base';

export class Migration606SignatureSpells extends MigrationBase {
    static version = 0.606;

    async updateItem(item: ItemData) {
        if (item.type === 'spellcastingEntry' && !item.data.signatureSpells) {
            item.data.signatureSpells = {
                value: [],
            };
        }
    }
}
