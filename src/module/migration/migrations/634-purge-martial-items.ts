import { ActorSourcePF2e } from '@actor/data';
import { WeaponSource } from '@item/data';
import { MartialSource } from '@item/deprecated';
import { MigrationBase } from '../base';

export class Migration634PurgeMartialItems extends MigrationBase {
    static version = 0.634;

    async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        const martialItems = actorData.items.filter(
            (itemData): itemData is MartialSource => itemData.type === 'martial',
        );
        const martialIds = martialItems.map((itemData) => itemData._id);
        const martialItemWeapons = actorData.items.filter(
            (itemData): itemData is WeaponSource =>
                itemData.type === 'weapon' && martialIds.includes(itemData.data.weaponType.value ?? 'simple'),
        );

        for (const weaponData of martialItemWeapons) {
            weaponData.data.weaponType.value = 'simple';
        }

        actorData.items = actorData.items.filter((itemData) => itemData.type !== 'martial');
    }
}
