import { MigrationBase } from './base';

export class Migration583AddHpThresholdHardness extends MigrationBase {
    static version = 0.583;
    async updateItem(item: any, actor?: any) {
        if (['weapon', 'melee', 'armor', 'equipment', 'consumable', 'backpack'].includes(item.type)) {
            item.data.brokenThreshold = { value: 0 };
            item.data.hp = { value: 0 };
            item.data.maxHp = { value: 0 };
            item.data.hardness = { value: 0 };
        }
    }
}
