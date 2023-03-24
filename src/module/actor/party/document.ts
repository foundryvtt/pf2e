import { ActorPF2e, CharacterPF2e } from "@actor";
import { TokenDocumentPF2e } from "@scene";
import { PartySource, PartySystemData } from "./data";

class PartyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    /** Friendship lives in our hearts */
    override get canAct(): false {
        return false;
    }

    get members(): (CharacterPF2e | null)[] {
        return this.system.details.members
            .map((uuid) => fromUuidSync(uuid))
            .map((a): CharacterPF2e | null => (a instanceof ActorPF2e && a.isOfType("character") ? a : null));
    }

    /** Our bond is unbreakable */
    override isAffectedBy(): false {
        return false;
    }
}

interface PartyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: PartySource;
    readonly abilities?: never;
    system: PartySystemData;
}

export { PartyPF2e };
