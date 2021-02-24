import { MigrationBase } from './base';

export class Migration559MigrateNpcItemDamageRolls extends MigrationBase {
    static version = 0.559;
    async updateItem(item: any, actor?: any) {
        if (!actor || actor.type !== 'npc') {
            return;
        }

        if (item.type === 'melee' && item.data.damage.die) {
            item.data.damageRolls = {
                migrated: {
                    damage: item.data.damage.die,
                    damageType: item.data.damage.damageType,
                },
            };
        }
    }
}
