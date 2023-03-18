import { ItemPF2e } from "@item/base";
import { LoreSource, LoreSystemData } from "./data";

export class LorePF2e extends ItemPF2e {}

export interface LorePF2e {
    readonly _source: LoreSource;
    system: LoreSystemData;
}
