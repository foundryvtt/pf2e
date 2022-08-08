import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemSource } from "@item/data/base";
import { ZeroToFour } from "@module/data";
import type { LorePF2e } from ".";

type LoreSource = BaseItemSourcePF2e<"lore", LoreSystemSource>;

type LoreData = Omit<LoreSource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<LorePF2e, "lore", LoreSystemData, LoreSource>;

interface LoreSystemSource extends ItemSystemSource {
    mod: {
        value: number;
    };
    proficient: {
        value: ZeroToFour;
    };
    variants?: Record<string, { label: string; options: string }>;
}

type LoreSystemData = LoreSystemSource;

export { LoreData, LoreSource };
