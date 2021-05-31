import { MigrationBase } from './base';
import { ItemSourcePF2e } from '@item/data';

export class Migration623NumifyPotencyRunes extends MigrationBase {
    static version = 0.623;

    async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (!(itemData.type === 'weapon' || itemData.type === 'armor')) return;

        const potencyRune: { value: number } | undefined = itemData.data.potencyRune;
        if (potencyRune) {
            potencyRune.value = Number(itemData.data.potencyRune.value) || 0;
        } else {
            itemData.data.potencyRune = { value: 0 };
        }
    }
}
