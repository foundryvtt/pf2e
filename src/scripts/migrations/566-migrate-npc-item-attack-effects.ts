import { MigrationBase } from './base';

export class Migration566MigrateNpcItemAttackEffects extends MigrationBase {
    static version = 0.566;
    async updateItem(item: any, actor?: any) {
        if (!actor || actor.type !== 'npc') {
            return;
        }

        if (item.type === 'melee' && item.data.attackEffects && !('value' in item.data.attackEffects)) {
            item.data.attackEffects = {
                value: item.data.attackEffects,
            };
        }
    }
}
