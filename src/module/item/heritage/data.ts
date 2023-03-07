import { CreatureTraits } from "@item/ancestry/data";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemData } from "@item/data/base";
import type { HeritagePF2e } from "./document";

type HeritageSource = BaseItemSourcePF2e<"heritage", HeritageSystemSource>;

interface HeritageData
    extends Omit<HeritageSource, "flags" | "system" | "type">,
        BaseItemDataPF2e<HeritagePF2e, "heritage", HeritageSource> {}

interface HeritageSystemSource extends ItemSystemData {
    ancestry: {
        name: string;
        slug: string;
        uuid: ItemUUID;
    } | null;
    traits: CreatureTraits;
    level?: never;
}

export type HeritageSystemData = HeritageSystemSource;

export { HeritageData, HeritageSource, HeritageSystemSource };
