import { ActorPF2e } from "@actor";
import { ActorUpdateContext } from "@actor/base";

export class ActorsPF2e<TActor extends ActorPF2e = ActorPF2e> extends Actors<TActor> {
    /** Work around a bug as of Foundry V9.242 in which token default settings are ignored for compendium imports */
    override fromCompendium(actor: TActor | TActor["_source"], options?: FromCompendiumOptions) {
        const defaultToken = game.settings.get("core", "defaultToken");
        delete defaultToken.disposition;

        if (actor instanceof ActorPF2e) {
            return super.fromCompendium(actor.clone({ prototypeToken: defaultToken }, { keepId: true }), options);
        } else {
            return super.fromCompendium(mergeObject(actor, { token: defaultToken }, { inplace: false }), options);
        }
    }

    /** Ditto */
    override async importFromCompendium(
        pack: CompendiumCollection<TActor>,
        actorId: string,
        updateData?: DocumentUpdateData<TActor>,
        options?: ActorUpdateContext<TActor>
    ): Promise<TActor | null> {
        const actor = await super.importFromCompendium(pack, actorId, updateData, options);
        if (!actor) return actor;

        const defaultToken = game.settings.get("core", "defaultToken");
        delete defaultToken.disposition;

        return actor.clone({ prototypeToken: defaultToken }, { keepId: true });
    }
}
