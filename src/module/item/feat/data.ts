import { ItemLevelData, ItemSystemData, ItemTraits } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { FeatPF2e } from ".";

export type FeatSource = BaseNonPhysicalItemSource<"feat", FeatSystemData>;

export class FeatData extends BaseNonPhysicalItemData<FeatPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/feat.svg";
}

export interface FeatData extends Omit<FeatSource, "_id" | "effects"> {
    type: FeatSource["type"];
    data: FeatSource["data"];
    readonly _source: FeatSource;
}

export type FeatTrait = keyof ConfigPF2e["PF2E"]["featTraits"];
export type FeatTraits = ItemTraits<FeatTrait>;
export type FeatType = keyof ConfigPF2e["PF2E"]["featTypes"];

export interface PrerequisiteTagData {
    value: string;
}

interface FeatSystemData extends ItemSystemData, ItemLevelData {
    featType: {
        value: FeatType;
    };
    actionType: {
        value: keyof ConfigPF2e["PF2E"]["actionTypes"];
    };
    actionCategory: {
        value: string;
    };
    actions: {
        value: string;
    };
    prerequisites: {
        value: PrerequisiteTagData[];
    };
    location: string;
}
