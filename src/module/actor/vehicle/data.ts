import {
    ActorAttributes,
    ActorDetailsSource,
    ActorHitPoints,
    ActorSystemData,
    ActorSystemSource,
    ActorTraitsData,
    BaseActorSourcePF2e,
    BaseHitPointsSource,
} from "@actor/data/base.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { ArmorClassTraceData } from "@system/statistic/armor-class.ts";
import { StatisticTraceData } from "@system/statistic/index.ts";
import { VehicleTrait } from "./types.ts";

/** The stored source data of a vehicle actor */
type VehicleSource = BaseActorSourcePF2e<"vehicle", VehicleSystemSource>;

interface VehicleHitPointsData extends Required<BaseHitPointsSource> {
    brokenThreshold: number;
    negativeHealing: false;
}

interface VehicleAttributesSource extends ActorAttributes {
    ac: { value: number };
    hardness: number;
    hp: VehicleHitPointsData;
    initiative?: never;
}

interface VehicleSystemSource extends ActorSystemSource {
    attributes: VehicleAttributesSource;
    details: VehicleDetailsSource;
    saves: {
        fortitude: VehicleFortitudeSaveData;
    };

    traits: VehicleTraitsData;
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
}

/** The system-level data of vehicle actors. */
interface VehicleSystemData extends VehicleSystemSource, Omit<ActorSystemData, "details" | "traits"> {
    attributes: VehicleAttributes;
}

interface VehicleAttributes extends VehicleAttributesSource, ActorAttributes {
    ac: ArmorClassTraceData;
    hp: VehicleHitPoints;
    initiative?: never;
    shield?: never;
}

interface VehicleHitPoints extends ActorHitPoints {
    negativeHealing: false;
    brokenThreshold: number;
}

interface VehicleFortitudeSaveData extends StatisticTraceData {
    saveDetail: string;
}

interface VehicleTraitsData extends ActorTraitsData<VehicleTrait> {
    rarity: keyof ConfigPF2e["PF2E"]["rarityTraits"];
    size: ActorSizePF2e;
}

interface TokenDimensions {
    width: number;
    height: number;
}

export { VehicleSource, VehicleSystemData, VehicleTrait, TokenDimensions };
