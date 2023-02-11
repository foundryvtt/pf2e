import { ActorPF2e, CharacterPF2e } from "@actor";
import { PartyData } from "./data";

class PartyPF2e extends ActorPF2e {
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

interface PartyPF2e extends ActorPF2e {
    readonly data: PartyData;
}

export { PartyPF2e };
