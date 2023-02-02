import {
    ActorSystemData,
    ActorAttributes,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseHitPointsData,
    ActorTraitsData,
    ActorSystemSource,
} from "@actor/data/base";
import { ActorSizePF2e } from "@actor/data/size";
import { StatisticTraceData } from "@system/statistic";
import { VehiclePF2e } from ".";
import { VehicleTrait } from "./types";

/** The stored source data of a vehicle actor */
type VehicleSource = BaseActorSourcePF2e<"vehicle", VehicleSystemSource>;

type VehicleData = Omit<VehicleSource, "effects" | "flags" | "items" | "prototypeToken"> &
    BaseActorDataPF2e<VehiclePF2e, "vehicle", VehicleSystemData, VehicleSource>;

interface VehicleHitPointsData extends Required<BaseHitPointsData> {
    brokenThreshold: number;
    negativeHealing: false;
}

interface VehicleAttributesSource extends ActorAttributes {
    ac: { value: number };
    hardness: number;
    hp: VehicleHitPointsData;
}

interface VehicleAttributesSystemData extends VehicleAttributesSource {
    ac: StatisticTraceData;
}

interface VehicleSystemSource extends ActorSystemSource {
    attributes: VehicleAttributesSource;
    details: {
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
    };
    saves: {
        fortitude: VehicleFortitudeSaveData;
    };

    traits: VehicleTraitsData;
}

/** The system-level data of vehicle actors. */
interface VehicleSystemData extends ActorSystemData {
    attributes: VehicleAttributesSystemData;
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

export { VehicleData, VehicleSource, VehicleTrait, TokenDimensions };
