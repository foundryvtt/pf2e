import {
    ActorAttributes,
    ActorAttributesSource,
    ActorDetailsSource,
    ActorHitPoints,
    ActorSystemData,
    ActorSystemSource,
    ActorTraitsSource,
    BaseActorSourcePF2e,
} from "@actor/data/base.ts";
import { ImmunitySource } from "@actor/data/iwr.ts";
import type { ActorSizePF2e } from "@actor/data/size.ts";
import { PublicationData, Rarity, Size } from "@module/data.ts";
import type { ArmorClassTraceData, StatisticTraceData } from "@system/statistic/index.ts";
import { VehicleTrait } from "./types.ts";

/** The stored source data of a vehicle actor */
type VehicleSource = BaseActorSourcePF2e<"vehicle", VehicleSystemSource>;

interface VehicleSystemSource extends ActorSystemSource {
    attributes: VehicleAttributesSource;
    details: VehicleDetailsSource;
    saves: {
        fortitude: VehicleFortitudeSaveData;
    };

    traits: VehicleTraitsSource;
}

interface VehicleAttributesSource extends ActorAttributesSource {
    ac: { value: number };
    hardness: number;
    initiative?: never;
    immunities: ImmunitySource[];
}

interface VehicleDetailsSource extends ActorDetailsSource {
    description: string;
    level: {
        value: number;
    };
    alliance: null;
    price: number;
    space: {
        long: number;
        wide: number;
        high: number;
    };
    crew: string;
    passengers: string;
    pilotingCheck: string;
    AC: number;
    speed: number;
    /** Information concerning the publication from which this actor originates */
    publication: PublicationData;
}

interface VehicleTraitsSource extends ActorTraitsSource<VehicleTrait> {
    rarity: Rarity;
    size: { value: Size };
    languages?: never;
}

/** The system-level data of vehicle actors. */
interface VehicleSystemData extends VehicleSystemSource, Omit<ActorSystemData, "details"> {
    attributes: VehicleAttributes;
    traits: VehicleTraits;
}

interface VehicleAttributes extends Omit<VehicleAttributesSource, AttributesSourceOmission>, ActorAttributes {
    ac: ArmorClassTraceData;
    hp: VehicleHitPoints;
    initiative?: never;
    shield?: never;
}
type AttributesSourceOmission = "immunities" | "weaknesses" | "resistances";

interface VehicleHitPoints extends ActorHitPoints {
    brokenThreshold: number;
}

interface VehicleFortitudeSaveData extends StatisticTraceData {
    saveDetail: string;
}

interface VehicleTraits extends VehicleTraitsSource {
    size: ActorSizePF2e;
}

interface TokenDimensions {
    width: number;
    height: number;
}

export type { TokenDimensions, VehicleSource, VehicleSystemData, VehicleTrait };
