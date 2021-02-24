import { MigrationBase } from './base';

export class Migration580MigrateOtherSpeeds extends MigrationBase {
    static version = 0.58;
    async updateItem(item: any, actor?: any) {
        if (!actor) return;

        if (!Array.isArray(actor.data?.attributes?.speed?.otherSpeeds)) {
            item.data.attributes.speed.otherSpeeds = [];
        }
    }
}
