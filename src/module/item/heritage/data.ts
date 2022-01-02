import { CreatureTraits } from "@item/ancestry/data";
import { ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import type { HeritagePF2e } from "./document";

export type HeritageSource = BaseNonPhysicalItemSource<"heritage", HeritageSystemSource>;

export class HeritageData extends BaseNonPhysicalItemData<HeritagePF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/heritage.svg";
}

export interface HeritageData extends Omit<HeritageSource, "effects" | "flags"> {
    type: "heritage";
    data: HeritageSystemData;
    readonly _source: HeritageSource;
}

export interface HeritageSystemSource extends ItemSystemData {
    ancestry: {
        name: string;
        uuid: ItemUUID;
    } | null;
    traits: CreatureTraits;
}

export type HeritageSystemData = HeritageSystemSource;
