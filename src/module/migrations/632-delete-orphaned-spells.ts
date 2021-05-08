import { MigrationBase } from './base';
import { SpellcastingEntryData, SpellData } from '@item/data/types';
import { ActorDataPF2e } from '@actor/data-definitions';

/** Delete owned spells with no corresponding spellcastiong entry */
export class Migration632DeleteOrphanedSpells extends MigrationBase {
    static version = 0.632;

    requiresFlush = true;

    async updateActor(actorData: ActorDataPF2e) {
        const spells = actorData.items.filter((itemData): itemData is SpellData => itemData.type === 'spell');
        const entries = actorData.items.filter(
            (itemData): itemData is SpellcastingEntryData => itemData.type === 'spellcastingEntry',
        );
        const orphans = spells.filter(
            (spellData) => !entries.some((entryData) => entryData._id === spellData.data.location.value),
        );
        actorData.items = actorData.items.filter((itemData) => !orphans.some((orphan) => orphan._id === itemData._id));
    }
}
