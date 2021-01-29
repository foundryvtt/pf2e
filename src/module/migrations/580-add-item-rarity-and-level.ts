import { MigrationBase } from './base';

export class Migration580AddItemRarityAndLevel extends MigrationBase {
    static version = 0.58;
    async updateItem(item: any, actor?: any) {
        item.data.rarity = { value: 'common' };

        if (['treasure', 'backpack'].includes(item.type)) {
            item.data.level = { value: '0' };
        }
    }
}
