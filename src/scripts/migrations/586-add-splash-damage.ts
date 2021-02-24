import { MigrationBase } from './base';

export class Migration586AddSplashDamage extends MigrationBase {
    static version = 0.586;
    async updateItem(item: any, actor?: any) {
        if (['weapon', 'melee'].includes(item.type)) {
            item.data.splashDamage = { value: '0' };
        }
    }
}
