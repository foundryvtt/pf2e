import type { ActorPF2e } from "@actor";
import { ItemPF2e, ItemSheetPF2e } from "@item";
import { BaseItemSourcePF2e, ItemSystemData, ItemSystemSource, OtherTagsOnly } from "@item/base/data/system.ts";
import { ZeroToFour } from "@module/data.ts";

class LorePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {}

interface LorePF2e<TParent extends ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: LoreSource;
    system: LoreSystemData;
}

type LoreSource = BaseItemSourcePF2e<"lore", LoreSystemSource>;

interface LoreSystemSource extends ItemSystemSource {
    traits: OtherTagsOnly;
    mod: { value: number };
    proficient: { value: ZeroToFour };
    variants?: Record<string, { label: string; options: string }>;
    level?: never;
}

interface LoreSystemData extends Omit<LoreSystemSource, "description">, ItemSystemData {
    level?: never;
    traits: OtherTagsOnly;
}

class LoreSheetPF2e extends ItemSheetPF2e<LorePF2e> {}

export { LorePF2e, LoreSheetPF2e };
export type { LoreSource, LoreSystemData };
