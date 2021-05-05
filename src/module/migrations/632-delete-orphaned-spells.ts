import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data/types';
import { ActorDataPF2e } from '@actor/data-definitions';

/** Delete owned spells with no corresponding spellcastiong entry */
export class Migration632DeleteOrphanedSpells extends MigrationBase {
    static version = 0.632;

    requiresFlush = true;

    async updateItem(itemData: ItemDataPF2e, actorData?: ActorDataPF2e) {
        if (!actorData || itemData.type !== 'spell') return;

        const ownedItems = actorData.items;
        const entry = ownedItems.find(
            (otherItemData) =>
                otherItemData.type === 'spellcastingEntry' && otherItemData._id === itemData.data.location.value,
        );

        if (!entry) {
            const spellData = ownedItems.find((otherItemData) => otherItemData._id === itemData._id);
            if (spellData?.type === 'spell') {
                ownedItems.splice(ownedItems.indexOf(spellData), 1);
            }
        }
    }
}
