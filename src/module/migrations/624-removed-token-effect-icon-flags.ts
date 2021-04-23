import { ActorDataPF2e } from '@actor/data-definitions';
import { MigrationBase } from './base';

export class Migration624RemoveTokenEffectIconFlags extends MigrationBase {
    static version = 0.624;

    async updateActor(actorData: ActorDataPF2e): Promise<void> {
        // remove deprecated rule element token effect flags
        if (actorData.flags?.pf2e?.token?.effects) {
            delete actorData.flags.pf2e.token.effects;
            actorData.flags.pf2e.token['-=effects'] = null;
        }
    }

    async updateToken(tokenData: TokenData): Promise<void> {
        // remove deprecated rule element token effects
        if (tokenData.actorData?.flags?.pf2e?.token?.effects) {
            delete tokenData.actorData.flags.pf2e.token.effects;
            tokenData.actorData.flags.pf2e.token['-=effects'] = null;
        }
    }
}
