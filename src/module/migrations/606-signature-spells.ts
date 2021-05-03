import { ItemDataPF2e } from '@item/data/types';
import { MigrationBase } from './base';

export class Migration606SignatureSpells extends MigrationBase {
    static version = 0.606;

    async updateItem(item: ItemDataPF2e) {
        if (item.type === 'spellcastingEntry' && !item.data.signatureSpells) {
            item.data.signatureSpells = {
                value: [],
            };
        }
    }
}
