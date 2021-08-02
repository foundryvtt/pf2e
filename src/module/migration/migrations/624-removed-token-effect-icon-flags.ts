import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

export class Migration624RemoveTokenEffectIconFlags extends MigrationBase {
    static override version = 0.624;

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        // remove deprecated rule element token effect flags
        if (actorData.flags?.pf2e?.token?.effects) {
            delete actorData.flags.pf2e.token.effects;
            if ("game" in globalThis) {
                actorData.flags.pf2e.token["-=effects"] = null;
            }
        }
    }

    override async updateToken(tokenData: foundry.data.TokenSource): Promise<void> {
        // remove deprecated rule element token effects
        if (tokenData.actorData.flags?.pf2e?.token?.effects) {
            delete tokenData.actorData.flags.pf2e.token.effects;
            if ("game" in globalThis) {
                tokenData.actorData.flags.pf2e.token["-=effects"] = null;
            }
        }
    }
}
