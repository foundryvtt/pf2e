import { ItemPF2e } from "@item/base";
import { LoreData, LoreSystemData } from "./data";

export class LorePF2e extends ItemPF2e {}

export interface LorePF2e {
    readonly data: LoreData;
    system: LoreSystemData;
}
