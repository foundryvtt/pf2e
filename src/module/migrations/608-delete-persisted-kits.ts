import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data-definitions';
import { ActorDataPF2e } from '@actor/data-definitions';

/** Unbreak actor sheets that have kit items in their inventories */
export class Migration608DeletePersistedKits extends MigrationBase {
    static version = 0.608;

    async updateItem(itemData: ItemDataPF2e, actorData?: ActorDataPF2e) {
        if (actorData && itemData.type === 'kit') {
            const index = actorData.items.indexOf(itemData);
            actorData.items.splice(index, 1);
        }
    }
}
