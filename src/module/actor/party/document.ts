import { ActorPF2e, CreaturePF2e } from "@actor";
import { ItemType } from "@item/data";
import { PartyData, PartySystemData } from "./data";

class PartyPF2e extends ActorPF2e {
    /** Friendship lives in our hearts */
    override get canAct(): false {
        return false;
    }

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "physical"];
    }

    get members(): (CreaturePF2e | null)[] {
        return this.system.details.members
            .map((uuid) => fromUuidSync(uuid))
            .map((a): CreaturePF2e | null => (a instanceof ActorPF2e && a.isOfType("creature") ? a : null));
    }

    /** Our bond is unbreakable */
    override isAffectedBy(): false {
        return false;
    }

    addMembers(...newMembers: CreaturePF2e[]) {
        const members = [...this.system.details.members, ...newMembers.map((m) => m.uuid)];
        this.update({ system: { details: { members } } });
    }

    removeMembers(...uuids: ActorUUID[]) {
        const members = this.system.details.members.filter((uuid) => !uuids.includes(uuid));
        this.update({ system: { details: { members } } });
    }
}

interface PartyPF2e extends ActorPF2e {
    readonly data: PartyData;
    readonly system: PartySystemData;
}

export { PartyPF2e };
