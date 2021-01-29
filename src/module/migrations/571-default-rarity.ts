import { MigrationBase } from './base';

export class Migration571AddDefaultRarity extends MigrationBase {
    static version = 0.571;
    async updateItem(item: any, actor?: any) {
        if (!actor || actor.type !== 'npc') {
            return;
        }

        if (!item.data.traits?.rarity?.value) {
            item.data.traits.rarity = { value: 'common' };
        }
    }
}
