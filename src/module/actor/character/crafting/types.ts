import { PhysicalItemPF2e } from "@item";

interface CraftingFormulaData {
    uuid: ItemUUID;
}

/** A formula prepared in a crafting ability, before the item has been loaded */
interface PreparedFormulaData extends CraftingFormulaData {
    quantity?: number;
    expended?: boolean;
    isSignatureItem?: boolean;
}

/** A crafting formula whose item has been loaded */
interface CraftingFormula extends CraftingFormulaData {
    item: PhysicalItemPF2e;
    batchSize: number;
    dc: number;
}

/** A formula prepared in a crafting ability whose item has been loaded */
type PreparedFormula = Required<PreparedFormulaData> & CraftingFormula;

export type { CraftingFormula, CraftingFormulaData, PreparedFormula, PreparedFormulaData };
