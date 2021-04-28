import { ActorDataPF2e } from '@actor/data-definitions';
import { MigrationBase } from './base';

interface BaseSaveData {
    value: number;
    rank: number;
    saveDetail: string;
}

interface BaseNPCSaves {
    fortitude: BaseSaveData;
    reflex: BaseSaveData;
    will: BaseSaveData;
}

/** Ensure presence of all three save types on NPCs */
export class Migration625EnsurePresenceOfSaves extends MigrationBase {
    static version = 0.625;

    async updateActor(actorData: ActorDataPF2e): Promise<void> {
        if (actorData.type !== 'npc') return;

        const saves: BaseNPCSaves = actorData.data.saves;
        for (const key of ['fortitude', 'reflex', 'will'] as const) {
            saves[key] ??= {
                value: 0,
                rank: 0,
                saveDetail: '',
            };
            if (typeof saves[key].value !== 'number') {
                saves[key].value = Number(saves[key].value) || 0;
            }
            if (typeof saves[key].rank !== 'number') {
                saves[key].rank = Number(saves[key].rank) || 0;
            }
            if (typeof saves[key].saveDetail !== 'string') {
                saves[key].saveDetail = '';
            }
        }
    }
}
