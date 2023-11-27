import type { ActorPF2e } from "@actor";
import { ItemPF2e, ItemSheetPF2e } from "@item";
import { ItemSheetOptions } from "@item/base/sheet/base.ts";
import { LoreSource, LoreSystemData } from "./data.ts";

class LorePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {}

interface LorePF2e<TParent extends ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: LoreSource;
    system: LoreSystemData;
}

class LoreSheetPF2e extends ItemSheetPF2e<LorePF2e> {
    static override get defaultOptions(): ItemSheetOptions {
        return { ...super.defaultOptions, hasSidebar: true };
    }
}

export { LorePF2e, LoreSheetPF2e };
