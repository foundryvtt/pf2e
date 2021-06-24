import { MigrationBase } from '../base';
import { ActorSourcePF2e } from '@actor/data';

/** Add basic actor traits to loot actors */
export class Migration609LootActorTraits extends MigrationBase {
    static override version = 0.609;

    override async updateActor(actorData: ActorSourcePF2e) {
        if (actorData.type === 'loot' && actorData.data.traits === undefined) {
            actorData.data.traits = {
                rarity: {
                    value: 'common',
                },
                size: {
                    value: 'med',
                },
                traits: {
                    value: [],
                    custom: '',
                },
                di: {
                    custom: '',
                    value: [],
                },
                dr: [],
                dv: [],
                ci: [],
            };
        }
    }
}
