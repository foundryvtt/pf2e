import {
    ActorSystemData,
    BaseActorAttributes,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseHitPointsData,
    BaseTraitsData,
} from "@actor/data/base";
import { ValuesList } from "@module/data";
import { VehiclePF2e } from ".";

/** The stored source data of a vehicle actor */
export type VehicleSource = BaseActorSourcePF2e<"vehicle", VehicleSystemData>;

/** The boxed data object of the vehicle actor */
export class VehicleData extends BaseActorDataPF2e<VehiclePF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/vehicle.svg";
}

export interface VehicleData extends Omit<VehicleSource, "effects" | "flags" | "items" | "token"> {
    type: VehicleSource["type"];
    data: VehicleSource["data"];
    readonly _source: VehicleSource;
}

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
        fortitude: {
            rank: number;
            value: number;
            saveDetail: string;
        };
    };

    traits: VehicleTraitsData;

    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}
export type VehicleTrait = keyof ConfigPF2e["PF2E"]["vehicleTraits"];
type VehicleTraits = ValuesList<VehicleTrait>;
interface VehicleTraitsData extends BaseTraitsData {
    traits: VehicleTraits;
}

export interface VehicleDimensions {
    length: number;
    width: number;
    height: number;
}

export interface TokenDimensions {
    width: number;
    height: number;
}
