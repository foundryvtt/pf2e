import { PhysicalItemPF2e } from "@item";

interface CraftingFormulaData {
    uuid: ItemUUID;
    sort?: number;
}

/** A crafting formula whose item has been loaded */
interface CraftingFormula extends CraftingFormulaData {
    item: PhysicalItemPF2e;
    batchSize: number;
    dc: number;
}

export type { CraftingFormula, CraftingFormulaData };
