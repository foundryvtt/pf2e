import { MigrationBase } from '../base';
import { ActorSourcePF2e } from '@actor/data';
import { ItemSourcePF2e, SpellcastingEntrySource } from '@item/data';
import { SpellcastingEntrySystemData } from '@item/spellcasting-entry/data';
import { CharacterSource } from '@actor/character/data';
import { NPCSource } from '@actor/npc/data';

interface SpellcastingEntrySystemDataOld extends Omit<SpellcastingEntrySystemData, 'focus'> {
    focus?: {
        points: number;
        pool: number;
    };
    '-=focus'?: null;
}

function isCreatureSource(source: ActorSourcePF2e): source is CharacterSource | NPCSource {
    return ['character', 'npc'].includes(source.type);
}

/** Focus Points became an actor resource. Relies on items running after actor */
export class Migration649FocusToActor extends MigrationBase {
    static override version = 0.649;

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        if (!isCreatureSource(actorData)) return;
        if (!actorData.data.resources) actorData.data.resources = {};

        // focus points in descending order by max pool
        const spellLists = actorData.items
            .filter((i): i is SpellcastingEntrySource => i.type === 'spellcastingEntry')
            .map((i) => i.data as SpellcastingEntrySystemDataOld)
            .filter((i) => i.focus)
            .sort((a, b) => (b.focus?.pool || 0) - (a.focus?.pool || 0));

        if (spellLists.length === 0) return;
        const focusOld = spellLists[0].focus;
        actorData.data.resources.focus = {
            value: focusOld?.points ?? 0,
            max: focusOld?.pool ?? 1,
        };
    }

    override async updateItem(itemData: ItemSourcePF2e, actorData: ActorSourcePF2e): Promise<void> {
        if (itemData.type !== 'spellcastingEntry') return;
        if (!isCreatureSource(actorData)) return;
        const data: SpellcastingEntrySystemDataOld = itemData.data;

        // Delete all spellcasting entry focus points that equal the actor's
        // If its an NPC though, always remove
        const { value, max } = actorData.data.resources.focus ?? {};
        const focusMatches = data.focus?.points === value && data.focus?.pool === max;
        if (actorData.type !== 'character' || focusMatches) {
            delete data.focus;
            if ('game' in globalThis) {
                data['-=focus'] = null;
            }
        }
    }
}
