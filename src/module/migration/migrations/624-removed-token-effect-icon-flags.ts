import { ActorSourcePF2e } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

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

    override async updateToken(tokenData: foundry.documents.TokenSource): Promise<void> {
        // remove deprecated rule element token effects
        const flags = (tokenData.delta?.flags ?? {}) as TokenEffectsFlag;
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
