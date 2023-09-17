import { CreatureTraits } from "@item/ancestry/data.ts";
import { BaseItemSourcePF2e, ItemSystemData, ItemSystemSource } from "@item/data/base.ts";

type HeritageSource = BaseItemSourcePF2e<"heritage", HeritageSystemSource>;

interface HeritageSystemSource extends ItemSystemSource {
    ancestry: {
        name: string;
        slug: string;
        uuid: ItemUUID;
    } | null;
    traits: CreatureTraits;
    level?: never;
}

interface HeritageSystemData extends HeritageSystemSource, Omit<ItemSystemData, "level" | "traits"> {}

export type { HeritageSource, HeritageSystemData, HeritageSystemSource };
