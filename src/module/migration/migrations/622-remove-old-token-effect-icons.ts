import { ActorSourcePF2e } from '@actor/data';
import { MigrationBase } from '../base';

export class Migration622RemoveOldTokenEffectIcons extends MigrationBase {
    static override version = 0.622;

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        // remove deprecated condition token effects
        actorData.token.effects =
            actorData.token.effects?.filter((fx) => !fx.startsWith('systems/pf2e/icons/conditions/')) ?? [];

        // remove deprecated rule element token effects
        const effects = actorData.flags.pf2e?.token?.effects ?? {};
        for (const img of Object.keys(effects)) {
            if (actorData.token.effects?.map((fx) => fx.replace(/[.]/g, '-'))?.includes(img)) {
                actorData.token.effects = actorData.token.effects.filter((fx) => fx.replace(/[.]/g, '-') !== img);
            }
        }
    }

    override async updateToken(tokenData: foundry.data.TokenSource): Promise<void> {
        // remove deprecated condition token effects
        tokenData.effects = tokenData.effects.filter((fx) => !fx.startsWith('systems/pf2e/icons/conditions/'));

        // remove deprecated rule element token effects
        const effects =
            tokenData.actorData.flags?.pf2e?.token?.effects ??
            game.actors.get(tokenData.actorId)?.data?.flags?.pf2e?.token?.effects ??
            {};
        for (const img of Object.keys(effects)) {
            if (tokenData.effects.map((fx) => fx.replace(/[.]/g, '-')).includes(img)) {
                tokenData.effects = tokenData.effects.filter((fx) => fx.replace(/[.]/g, '-') !== img);
            }
        }
    }
}
