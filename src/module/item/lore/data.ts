import { BaseItemSourcePF2e, ItemSystemSource } from "@item/data/base.ts";
import { ZeroToFour } from "@module/data.ts";

type LoreSource = BaseItemSourcePF2e<"lore", LoreSystemSource>;

interface LoreSystemSource extends ItemSystemSource {
    mod: {
        value: number;
    };
    proficient: {
        value: ZeroToFour;
    };
    variants?: Record<string, { label: string; options: string }>;
    level?: never;
    traits?: never;
}

type LoreSystemData = LoreSystemSource;

export { LoreSource, LoreSystemData };
