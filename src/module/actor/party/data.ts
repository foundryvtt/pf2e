import {
    ActorAttributes,
    ActorSystemData,
    ActorSystemSource,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
} from "@actor/data/base";
import { PartyPF2e } from "./document";

type PartySource = BaseActorSourcePF2e<"party", PartySystemSource>;

type PartyData = Omit<PartySource, "effects" | "flags" | "items" | "prototypeToken"> &
    BaseActorDataPF2e<PartyPF2e, "party", PartySystemData, PartySource>;

interface PartySystemSource extends ActorSystemSource {
    attributes: PartyAttributesSource;
    details: PartyDetailsSource;
}

interface PartyAttributesSource extends ActorAttributes {
    hp?: never;
    ac?: never;
    immunities: never[];
    weaknesses: never[];
    resistances: never[];
}

interface PartyDetailsSource {
    description: string;
    level: {
        value: number;
    };
    members: ActorUUID[];
}

type PartySystemData = PartySystemSource & ActorSystemData;

export { PartyData };
