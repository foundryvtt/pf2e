import { PhysicalItemPF2e } from "@item";
import { Predicate, RawPredicate } from "@system/predication.ts";

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

interface CraftingAbilityData {
    slug: string;
    resource: string | null;
    label: string;
    isAlchemical: boolean;
    isDailyPrep: boolean;
    isPrepared: boolean;
    maxSlots: number | null;
    craftableItems: CraftableItemDefinition[];
    fieldDiscovery?: RawPredicate | null;
    batchSize: number;
    fieldDiscoveryBatchSize?: number;
    maxItemLevel: number;
    preparedFormulaData: PreparedFormulaData[];
}

interface CraftableItemDefinition {
    predicate: Predicate;
    batchSize?: number;
}

export type {
    CraftableItemDefinition,
    CraftingAbilityData,
    CraftingFormula,
    CraftingFormulaData,
    PreparedFormula,
    PreparedFormulaData,
};
