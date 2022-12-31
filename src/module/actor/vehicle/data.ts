import {
    ActorSystemData,
    ActorAttributes,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseHitPointsData,
    ActorTraitsData,
} from "@actor/data/base";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
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

interface VehicleAttributes extends ActorAttributes {
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

interface VehicleTraitsData extends ActorTraitsData<VehicleTrait> {
    rarity: keyof ConfigPF2e["PF2E"]["rarityTraits"];
    size: ActorSizePF2e;
}

interface TokenDimensions {
    width: number;
    height: number;
}

interface VehicleSheetData extends ActorSheetDataPF2e<VehiclePF2e> {
    actorRarities: typeof CONFIG.PF2E.rarityTraits;
    actorRarity: string;
    actorSizes: typeof CONFIG.PF2E.actorSizes;
    actorSize: string;
    data: {
        traits: VehicleTraitsData;
    };
}

export { VehicleData, VehicleSheetData, VehicleSource, VehicleTrait, TokenDimensions };
