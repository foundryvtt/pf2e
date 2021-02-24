import { MigrationBase } from './base';

export class Migration588NpcActionCategory extends MigrationBase {
    static version = 0.588;
    async updateItem(item: any, actor?: any) {
        if (!actor || actor.type !== 'npc') {
            return;
        }

        if (item.type === 'action' && Object.prototype.hasOwnProperty.call(item.flags, 'pf2e_updatednpcsheet')) {
            const oldValue = item.flags.pf2e_updatednpcsheet.npcActionType?.value;
            if (!item.data.actionCategory?.value) {
                item.data.actionCategory = { value: oldValue || 'offensive' };
            }

            delete item.flags.pf2e_updatednpcsheet;
        }
    }
}
