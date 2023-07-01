import { ActorPF2e, PartyPF2e } from "@actor";
import { ActorUpdateContext } from "@actor/base.ts";

export class ActorsPF2e<TActor extends ActorPF2e<null>> extends Actors<TActor> {
    /** The world's active party, if one exists */
    get party(): PartyPF2e<null> | null {
        // Eventually we'll need to implement active parties, but this is stubbed for development of other features
        return (this as Actors<ActorPF2e<null>>).find<PartyPF2e<null>>((a) => a.isOfType("party")) ?? null;
    }

    /** Overrwriten to omit actors in parties, which are rendered separately */
    override _getVisibleTreeContents(): TActor[] {
        return super
            ._getVisibleTreeContents()
            .filter((a) => (a.isOfType("creature") && !a.parties.size) || !a.isOfType("party", "creature"));
    }

    /** Work around a bug as of Foundry V9.242 in which token default settings are ignored for compendium imports */
    override fromCompendium(actor: TActor | TActor["_source"], options?: FromCompendiumOptions): TActor["_source"] {
        const defaultToken = deepClone(game.settings.get("core", "defaultToken"));
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
        options?: ActorUpdateContext<null>
    ): Promise<TActor | null> {
        const actor = await super.importFromCompendium(pack, actorId, updateData, options);
        if (!actor) return actor;

        const defaultToken = deepClone(game.settings.get("core", "defaultToken"));
        delete defaultToken.disposition;

        return actor.clone({ prototypeToken: defaultToken }, { keepId: true });
    }
}
