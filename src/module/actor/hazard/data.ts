import { SaveData } from "@actor/creature/data.ts";
import {
    ActorAttributes,
    ActorAttributesSource,
    ActorDetails,
    ActorDetailsSource,
    ActorHitPoints,
    ActorSystemData,
    ActorSystemSource,
    ActorTraitsSource,
    BaseActorSourcePF2e,
} from "@actor/data/base.ts";
import type { ActorSizePF2e } from "@actor/data/size.ts";
import { InitiativeTraceData } from "@actor/initiative.ts";
import { NPCStrike } from "@actor/npc/index.ts";
import { SaveType } from "@actor/types.ts";
import { PublicationData, Rarity, Size } from "@module/data.ts";
import { HazardTrait } from "./types.ts";

/** The stored source data of a hazard actor */
type HazardSource = BaseActorSourcePF2e<"hazard", HazardSystemSource>;

/** The raw information contained within the actor data object for hazards. */
interface HazardSystemSource extends ActorSystemSource {
    details: HazardDetailsSource;
    attributes: HazardAttributesSource;
    saves: HazardSaves;
    /** Traits, languages, and other information. */
    traits: HazardTraitsSource;
}

interface HazardAttributesSource extends ActorAttributesSource {
    ac: { value: number };
    hp: {
        value: number;
        max: number;
        temp: number;
        details: string;
    };
    perception?: never;
    initiative?: never;
    hardness: number;
    stealth: {
        value: number | null;
        details: string;
    };
    emitsSound: boolean | "encounter";
}

interface HazardDetailsSource extends ActorDetailsSource {
    isComplex: boolean;
    level: { value: number };
    disable?: string;
    description?: string;
    reset?: string;
    routine?: string;
    /** Information concerning the publication from which this actor originates */
    publication: PublicationData;

    readonly alliance?: never;
}

interface HazardSystemData extends Omit<HazardSystemSource, "attributes" | "details">, Omit<ActorSystemData, "traits"> {
    attributes: HazardAttributes;
    details: HazardDetails;
    traits: HazardTraitsData;
    actions: NPCStrike[];
}

interface HazardTraitsSource extends ActorTraitsSource<HazardTrait> {
    size: { value: Size };
    rarity: Rarity;
    languages?: never;
}

interface HazardTraitsData extends HazardTraitsSource {
    size: ActorSizePF2e;
    rarity: Rarity;
}

interface HazardAttributes
    extends Omit<HazardAttributesSource, "initiative" | "immunities" | "weaknesses" | "resistances">,
        Omit<ActorAttributes, "perception" | "shield"> {
    ac: {
        value: number;
    };
    hasHealth: boolean;
    hp: HazardHitPoints;
    hardness: number;
    initiative?: InitiativeTraceData;
    stealth: {
        value: number | null;
        details: string;
    };
    /**
     * Whether the hazard emits sound and can therefore be detected via hearing. A value of "encounter" indicates it is
     * silent until an encounter begins.
     */
    emitsSound: boolean | "encounter";

    shield?: never;
}

interface HazardDetails extends Omit<HazardDetailsSource, "alliance">, ActorDetails {
    alliance: null;
}

interface HazardHitPoints extends ActorHitPoints {
    brokenThreshold: number;
}

type HazardSaveData = Omit<SaveData, "attribute">;
type HazardSaves = Record<SaveType, HazardSaveData>;

export type { HazardSource, HazardSystemData };
