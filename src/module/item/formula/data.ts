import { ItemLevelData, ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { FormulaPF2e } from ".";

export type FormulaSource = BaseNonPhysicalItemSource<"formula", FormulaSystemData>;

export class FormulaData extends BaseNonPhysicalItemData<FormulaPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/lore.svg";
}

export interface FormulaData extends Omit<FormulaSource, "_id" | "effects"> {
    type: FormulaSource["type"];
    data: FormulaSource["data"];
    readonly _source: FormulaSource;
}

type ItemUUID = `Compendium.${string}.${string}` | `Item.${string}.${string}`;

interface FormulaSystemData extends ItemSystemData, ItemLevelData {
    craftedItem: {
        uuid: ItemUUID;
    };
}
