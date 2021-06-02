import { ActorSourcePF2e } from '@actor/data';
import { ItemSourcePF2e } from '@item/data';
import { isPhysicalData } from '@item/data/helpers';
import { MigrationBase } from '../base';

export class Migration635NumifyACAndQuantity extends MigrationBase {
    static version = 0.635;

    async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        if (actorData.type !== 'loot') {
            actorData.data.attributes.ac.value = Number(actorData.data.attributes.ac.value);
        }
    }

    async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (isPhysicalData(itemData)) {
            itemData.data.quantity.value = Number(itemData.data.quantity.value);
        }
    }
}
