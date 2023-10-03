import type { ActorPF2e } from "@actor";
import type { ActorSourcePF2e } from "@actor/data/index.ts";
import { SIZE_LINKABLE_ACTOR_TYPES } from "@actor/values.ts";
import { MigrationBase } from "../base.ts";

export class Migration866LinkToActorSizeAgain extends MigrationBase {
    static override version = 0.866;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (SIZE_LINKABLE_ACTOR_TYPES.has(actorSource.type)) return;

        if (actorSource.prototypeToken.flags.pf2e) {
            actorSource.prototypeToken.flags.pf2e.linkToActorSize = false;
            actorSource.prototypeToken.flags.pf2e.autoscale = false;
        }
    }

    override async updateToken(tokenSource: foundry.documents.TokenSource, actor: ActorPF2e | null): Promise<void> {
        if (!actor || SIZE_LINKABLE_ACTOR_TYPES.has(actor.type)) {
            return;
        }

        mergeObject(tokenSource.flags, {
            pf2e: {
                linkToActorSize: false,
                autoscale: false,
            },
        });
    }
}
