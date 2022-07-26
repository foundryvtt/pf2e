import { SaveData } from "@actor/creature/data";
import {
    ActorSystemData,
    ActorAttributes,
    BaseActorDataPF2e,
    BaseActorSourcePF2e,
    BaseHitPointsData,
    ActorTraitsData,
    GangUpCircumstance,
} from "@actor/data/base";
import { SaveType } from "@actor/types";
import { ActorSizePF2e } from "@actor/data/size";
import { SiegeWeaponPF2e } from ".";
import { SiegeWeaponProficiencyType, SiegeWeaponPropulsionMethod, SiegeWeaponTrait } from "./types";

/** The stored source data of a siege weapon actor */
type SiegeWeaponSource = BaseActorSourcePF2e<"siegeWeapon", SiegeWeaponSystemData>;

interface SiegeWeaponData
    extends Omit<SiegeWeaponSource, "data" | "system" | "effects" | "flags" | "items" | "prototypeToken" | "type">,
        BaseActorDataPF2e<SiegeWeaponPF2e, "siegeWeapon", SiegeWeaponSystemData, SiegeWeaponSource> {}

interface SiegeWeaponHitPointsData extends Required<BaseHitPointsData> {
    brokenThreshold: number;
    negativeHealing: false;
}

interface SiegeWeaponAttributes extends ActorAttributes {
    ac: {
        value: number;
        check: number;
        details: string;
    };
    flanking: {
        canFlank: false;
        canGangUp: GangUpCircumstance[];
        flankable: false;
        flatFootable: false;
    };
    hardness: number;
    hp: SiegeWeaponHitPointsData;
}

/** The system-level data of siege weapon actors. */
interface SiegeWeaponSystemData extends ActorSystemData {
    attributes: SiegeWeaponAttributes;
    details: {
        alliance: null;
        bulk: number;
        crew: {
            min: number;
            max: number;
        };
        description: string;
        level: {
            value: number;
        };
        price: number;
        proficiency: SiegeWeaponProficiencyType;
        propulsion: SiegeWeaponPropulsionMethod;
        space: {
            long: number;
            wide: number;
            high: number;
        };
        speed: number;
        usage: string;
    };
    saves: SiegeWeaponSavesData;
    traits: SiegeWeaponTraitsData;
}

type SiegeWeaponSavesData = Record<SaveType, SaveData>;

interface SiegeWeaponTraitsData extends ActorTraitsData<SiegeWeaponTrait> {
    rarity: keyof ConfigPF2e["PF2E"]["rarityTraits"];
    size: ActorSizePF2e;
}

interface TokenDimensions {
    width: number;
    height: number;
}

export { SiegeWeaponData, SiegeWeaponSource, SiegeWeaponSystemData, TokenDimensions };
