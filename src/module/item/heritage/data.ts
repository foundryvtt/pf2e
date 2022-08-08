import { CreatureTraits } from "@item/ancestry/data";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemData } from "@item/data/base";
import type { HeritagePF2e } from "./document";

type HeritageSource = BaseItemSourcePF2e<"heritage", HeritageSystemSource>;

type HeritageData = Omit<HeritageSource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<HeritagePF2e, "heritage", HeritageSystemData, HeritageSource>;

interface HeritageSystemSource extends ItemSystemData {
    ancestry: {
        name: string;
        uuid: ItemUUID;
    } | null;
    traits: CreatureTraits;
}

export type HeritageSystemData = HeritageSystemSource;

export { HeritageData, HeritageSource, HeritageSystemSource };
