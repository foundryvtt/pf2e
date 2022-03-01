import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

export class Migration624RemoveTokenEffectIconFlags extends MigrationBase {
    static override version = 0.624;

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        // remove deprecated rule element token effect flags
        const flags = actorData.flags as TokenEffectsFlag;
        if (flags.pf2e?.token?.effects) {
            delete flags.pf2e.token.effects;
            if ("game" in globalThis) {
                flags.pf2e.token["-=effects"] = null;
            }
        }
    }

    override async updateToken(tokenData: foundry.data.TokenSource): Promise<void> {
        // remove deprecated rule element token effects
        const flags = (tokenData.actorData.flags ?? {}) as TokenEffectsFlag;
        if (flags.pf2e?.token?.effects) {
            delete flags.pf2e.token.effects;
            if ("game" in globalThis) {
                flags.pf2e.token["-=effects"] = null;
            }
        }
    }
}

type TokenEffectsFlag = {
    pf2e?: {
        token?: {
            effects?: Record<string, unknown>;
            "-=effects"?: null;
        };
    };
};
