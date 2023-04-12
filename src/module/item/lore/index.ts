import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item/base.ts";
import { LoreSource, LoreSystemData } from "./data.ts";

class LorePF2e<TParent extends ActorPF2e | null> extends ItemPF2e<TParent> {}

interface LorePF2e<TParent extends ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: LoreSource;
    system: LoreSystemData;
}

export { LorePF2e };
