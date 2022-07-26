import { SiegeWeaponPF2e } from "@actor";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
import { SaveType } from "@actor/types";
import { ActionItemPF2e } from "@item";

interface SiegeWeaponSheetData extends ActorSheetDataPF2e<SiegeWeaponPF2e> {
    actions: SiegeWeaponActionSheetData;
    editing: boolean;
    actorSizes: Record<string, string>;
    actorSize: string;
    actorRarities: Record<string, string>;
    actorRarity: string;
    brokenThreshold: number;
    saves: SiegeWeaponSaveSheetData[];
    hasDefenses: boolean;
    hasHPDetails: boolean;
    hasSaves: boolean;
    hasIWR: boolean;
    hasDescription: boolean;
    isPortable: boolean;
    proficiencyTypes: Record<string, string>;
    propulsionMethods: Record<string, string>;
}

interface SiegeWeaponActionSheetData {
    action: ActionItemPF2e[];
    reaction: ActionItemPF2e[];
    free: ActionItemPF2e[];
}

interface SiegeWeaponSaveSheetData {
    label: string;
    type: SaveType;
    mod?: number;
}

type SiegeWeaponTrait = keyof ConfigPF2e["PF2E"]["siegeWeaponTraits"];
type SiegeWeaponProficiencyType = "simple" | "martial" | "advanced";
type SiegeWeaponPropulsionMethod = "none" | "pp";

export {
    SiegeWeaponActionSheetData,
    SiegeWeaponSaveSheetData,
    SiegeWeaponSheetData,
    SiegeWeaponTrait,
    SiegeWeaponProficiencyType,
    SiegeWeaponPropulsionMethod,
};
