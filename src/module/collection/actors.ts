import { ActorPF2e, PartyPF2e } from "@actor";

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
}
