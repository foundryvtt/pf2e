import { ItemSourcePF2e } from '@item/data';
import { MigrationBase } from '../base';

export class Migration606SignatureSpells extends MigrationBase {
    static version = 0.606;

    async updateItem(item: ItemSourcePF2e) {
        if (item.type === 'spellcastingEntry' && !item.data.signatureSpells) {
            item.data.signatureSpells = {
                value: [],
            };
        }
    }
}
