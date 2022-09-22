import {
    ActorSystemData,
    BaseActorAttributes,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseHitPointsData,
    BaseTraitsData,
} from "@actor/data/base";
import { ActorSizePF2e } from "@actor/data/size";
import { StatisticTraceData } from "@system/statistic";
import { VehiclePF2e } from ".";
import { VehicleTrait } from "./types";

/** The stored source data of a vehicle actor */
type VehicleSource = BaseActorSourcePF2e<"vehicle", VehicleSystemData>;

type VehicleData = Omit<VehicleSource, "effects" | "flags" | "items" | "prototypeToken"> &
    BaseActorDataPF2e<VehiclePF2e, "vehicle", VehicleSystemData, VehicleSource>;

interface VehicleHitPointsData extends Required<BaseHitPointsData> {
    brokenThreshold: number;
    negativeHealing: false;
}

interface VehicleAttributes extends BaseActorAttributes {
    ac: {
        value: number;
        check: number;
        details: string;
    };
    hardness: number;
    hp: VehicleHitPointsData;
}

/** The system-level data of vehicle actors. */
interface VehicleSystemData extends ActorSystemData {
    attributes: VehicleAttributes;
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

interface VehicleFortitudeSaveData extends StatisticTraceData {
    saveDetail: string;
}

interface VehicleTraitsData extends BaseTraitsData<VehicleTrait> {
    size: ActorSizePF2e;
}

interface TokenDimensions {
    width: number;
    height: number;
}

export { VehicleData, VehicleSource, VehicleTrait, TokenDimensions };
