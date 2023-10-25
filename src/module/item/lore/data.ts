import { BaseItemSourcePF2e, ItemSystemSource, OtherTagsOnly } from "@item/base/data/system.ts";
import { ZeroToFour } from "@module/data.ts";

type LoreSource = BaseItemSourcePF2e<"lore", LoreSystemSource>;

interface LoreSystemSource extends ItemSystemSource {
    traits: OtherTagsOnly;
    mod: {
        value: number;
    };
    proficient: {
        value: ZeroToFour;
    };
    variants?: Record<string, { label: string; options: string }>;
    level?: never;
}

type LoreSystemData = LoreSystemSource;

export type { LoreSource, LoreSystemData };
