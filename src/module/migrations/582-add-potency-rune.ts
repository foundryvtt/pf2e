import { MigrationBase } from './base';
import { toNumber } from '../utils';

export class Migration582AddPotencyRune extends MigrationBase {
    static version = 0.582;
    async updateItem(item: any) {
        if (item.type === 'weapon') {
            const bonusAttack = toNumber(item.data?.bonus?.value ?? '') ?? 0;
            if (bonusAttack > 0 && bonusAttack < 5) {
                item.data.potencyRune.value = `${bonusAttack}`;
            }
        }
    }
}
