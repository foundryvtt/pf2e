import { ActorDataPF2e, CreatureData } from ".";

export function isCreatureData(actorData: ActorDataPF2e): actorData is CreatureData {
    return ["character", "npc", "familiar"].includes(actorData.type);
}
