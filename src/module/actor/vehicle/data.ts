import {
    ActorAttributes,
    ActorAttributesSource,
    ActorDetailsSource,
    ActorSystemData,
    ActorSystemSource,
    ActorTraitsData,
    BaseActorSourcePF2e,
    HitPointsStatistic,
} from "@actor/data/base.ts";
import { ImmunitySource } from "@actor/data/iwr.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { ArmorClassTraceData } from "@system/statistic/armor-class.ts";
import { StatisticTraceData } from "@system/statistic/index.ts";
import { VehicleTrait } from "./types.ts";

/** The stored source data of a vehicle actor */
type VehicleSource = BaseActorSourcePF2e<"vehicle", VehicleSystemSource>;

interface VehicleSystemSource extends ActorSystemSource {
    attributes: VehicleAttributesSource;
    details: VehicleDetailsSource;
    saves: {
        fortitude: VehicleFortitudeSaveData;
    };

    traits: VehicleTraitsData;
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
}

/** The system-level data of vehicle actors. */
interface VehicleSystemData extends VehicleSystemSource, Omit<ActorSystemData, "attributes" | "details" | "traits"> {
    attributes: VehicleAttributes;
}

interface VehicleAttributes extends Omit<VehicleAttributesSource, AttributesSourceOmission>, ActorAttributes {
    ac: ArmorClassTraceData;
    hp: VehicleHitPoints;
    initiative?: never;
    shield?: never;
}
type AttributesSourceOmission = "immunities" | "weaknesses" | "resistances";

interface VehicleHitPoints extends HitPointsStatistic {
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

export { TokenDimensions, VehicleSource, VehicleSystemData, VehicleTrait };
