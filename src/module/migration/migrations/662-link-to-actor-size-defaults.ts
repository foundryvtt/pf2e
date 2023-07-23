import { ActorPF2e } from "@actor";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Set default linkToActorSize flag */
export class Migration662LinkToActorSizeDefaults extends MigrationBase {
    static override version = 0.662;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        const linkToActorSize = !["hazard", "loot"].includes(actorSource.type);
        actorSource.prototypeToken.flags ??= { pf2e: { linkToActorSize } };
        actorSource.prototypeToken.flags.pf2e ??= { linkToActorSize };
        actorSource.prototypeToken.flags.pf2e.linkToActorSize ??= linkToActorSize;
    }

    override async updateToken(tokenSource: foundry.documents.TokenSource, actor: ActorPF2e): Promise<void> {
        const linkToActorSize = !["hazard", "loot"].includes(actor.type);
        tokenSource.flags.pf2e ??= { linkToActorSize };
        tokenSource.flags.pf2e.linkToActorSize ??= linkToActorSize;
    }
}
