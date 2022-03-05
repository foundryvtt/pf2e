import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

export class Migration622RemoveOldTokenEffectIcons extends MigrationBase {
    static override version = 0.622;

    override async updateActor(actorData: ActorWithTokenEffect): Promise<void> {
        // Remove deprecated condition token effects
        if (actorData.token.effects) {
            actorData.token["-=effects"] = null;
        }

        // Remove deprecated rule element token effects
        const effects = actorData.flags.pf2e?.token?.effects ?? {};
        for (const img of Object.keys(effects)) {
            if (actorData.token.effects?.map((fx) => fx.replace(/[.]/g, "-"))?.includes(img)) {
                actorData.token.effects = actorData.token.effects.filter((fx) => fx.replace(/[.]/g, "-") !== img);
            }
        }
    }

    override async updateToken(tokenData: foundry.data.TokenSource): Promise<void> {
        // Remove deprecated condition token effects
        tokenData.effects = tokenData.effects.filter((fx) => !fx.startsWith("systems/pf2e/icons/conditions/"));

        // Remove deprecated rule element token effects
        const actorData = tokenData.actorData as DeepPartial<ActorWithTokenEffect>;
        const effects = actorData.flags?.pf2e?.token?.effects ?? {};
        for (const img of Object.keys(effects)) {
            if (tokenData.effects.map((fx) => fx.replace(/[.]/g, "-")).includes(img)) {
                tokenData.effects = tokenData.effects.filter((fx) => fx.replace(/[.]/g, "-") !== img);
            }
        }
    }
}

type TokenEffectsFlag = {
    pf2e?: {
        token?: {
            effects?: Record<string, unknown>;
        };
    };
};

type ActorWithTokenEffect = ActorSourcePF2e & {
    token: ActorSourcePF2e["token"] & {
        effects?: string[];
        "-=effects"?: null;
        flags: TokenEffectsFlag;
    };

    flags: TokenEffectsFlag;
};
