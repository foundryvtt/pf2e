import { MigrationBase } from '../base';
import { ItemSourcePF2e } from '@item/data';
import { ActorSourcePF2e } from '@actor/data';

/** Unbreak actor sheets that have kit items in their inventories */
export class Migration608DeletePersistedKits extends MigrationBase {
    static override version = 0.608;

    override async updateItem(itemData: ItemSourcePF2e, actorData?: ActorSourcePF2e) {
        if (actorData && itemData.type === 'kit') {
            const index = actorData.items.indexOf(itemData);
            actorData.items.splice(index, 1);
        }
    }
}
