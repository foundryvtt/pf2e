import type { ActorPF2e, FamiliarPF2e, PartyPF2e } from "@actor";

export class ActorsPF2e<TActor extends ActorPF2e<null>> extends fd.collections.Actors<TActor> {
    /** The world's active party, if one exists */
    get party(): PartyPF2e<null> | null {
        const activePartyId = game.settings.get("pf2e", "activeParty");
        const actor = this.get(activePartyId);
        return actor?.isOfType("party")
            ? actor
            : ((this as fd.collections.Actors<ActorPF2e<null>>).find<PartyPF2e<null>>((a) => a.isOfType("party")) ??
                  null);
    }

    /** Ensure familiars and then parties are initialized after all other subtypes. */
    protected override _initialize(): void {
        super._initialize();
        const familiars: (TActor & FamiliarPF2e<null>)[] = [];
        const parties: (TActor & PartyPF2e<null>)[] = [];
        for (const actor of this.values()) {
            if (actor.isOfType("familiar")) familiars.push(actor);
            else if (actor.isOfType("party")) parties.push(actor);
        }
        for (const actor of [...familiars, ...parties]) {
            this.delete(actor.id);
            this.set(actor.id, actor);
        }
    }

    /** Overrwriten to omit actors in parties, which are rendered separately */
    override _getVisibleTreeContents(): TActor[] {
        return super
            ._getVisibleTreeContents()
            .filter((a) => (a.isOfType("creature") && !a.parties.size) || !a.isOfType("party", "creature"));
    }
}
