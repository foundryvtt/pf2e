import {
    ActorAttributes,
    ActorAttributesSource,
    ActorDetails,
    ActorSystemData,
    ActorSystemSource,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
} from "@actor/data/base";
import { PartyPF2e } from "./document";

type PartySource = BaseActorSourcePF2e<"party", PartySystemSource>;

type PartyData = Omit<PartySource, "effects" | "flags" | "items" | "prototypeToken"> &
    BaseActorDataPF2e<PartyPF2e, "party", PartySource>;

interface PartySystemSource extends ActorSystemSource {
    attributes: PartyAttributesSource;
    details: PartyDetailsSource;
    traits?: never;
}

interface PartyAttributesSource extends ActorAttributesSource {
    hp?: never;
    ac?: never;
    initiative?: never;
    immunities?: never;
    weaknesses?: never;
    resistances?: never;
}

interface PartyDetailsSource {
    description: string;
    level: {
        value: number;
    };
    members: ActorUUID[];
}

interface PartySystemData extends Omit<PartySystemSource, "attributes">, Omit<ActorSystemData, "traits"> {
    attributes: PartyAttributes;
    details: PartyDetails;
}

interface PartyAttributes
    extends Omit<PartyAttributesSource, "immunities" | "weaknesses" | "resistances">,
        Omit<ActorAttributes, "initiative" | "ac" | "hp"> {
    immunities: never[];
    weaknesses: never[];
    resistances: never[];
}

interface PartyDetails extends PartyDetailsSource, ActorDetails {}

export { PartyData, PartySystemData };
