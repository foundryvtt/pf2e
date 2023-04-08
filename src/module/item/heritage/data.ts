import { CreatureTraits } from "@item/ancestry/data.ts";
import { BaseItemSourcePF2e, ItemSystemData } from "@item/data/base.ts";

type HeritageSource = BaseItemSourcePF2e<"heritage", HeritageSystemSource>;

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

export { HeritageSource, HeritageSystemSource };
