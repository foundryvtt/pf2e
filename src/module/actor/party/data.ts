import {
    ActorAttributes,
    ActorAttributesSource,
    ActorDetails,
    ActorSystemData,
    ActorSystemSource,
    BaseActorSourcePF2e,
} from "@actor/data/base.ts";

type PartySource = BaseActorSourcePF2e<"party", PartySystemSource>;

interface PartySystemSource extends ActorSystemSource {
    attributes: PartyAttributesSource;
    details: PartyDetailsSource;
    traits?: never;
    campaign?: PartyCampaignSource;
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
    members: MemberData[];
}

interface MemberData {
    uuid: ActorUUID;
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
    speed: { value: number };
}

interface PartyDetails extends PartyDetailsSource, ActorDetails {}

type PartyCampaignSource = { type: string } & Record<string, unknown>;

export { MemberData, PartyCampaignSource, PartySource, PartySystemData };
