import { ItemLevelData, ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { ValuesList } from "@module/data";
import { FormulaPF2e } from ".";

export type FormulaSource = BaseNonPhysicalItemSource<"formula", FormulaSystemData>;

export class FormulaData extends BaseNonPhysicalItemData<FormulaPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/formula.svg";
}

export interface FormulaData extends Omit<FormulaSource, "_id" | "effects"> {
    type: FormulaSource["type"];
    data: FormulaSource["data"];
    readonly _source: FormulaSource;
}

export type CraftingType = "alchemical" | "magical" | "snare" | "mundane";

export type FieldDiscoveryType = "bomb" | "elixir" | "mutagen" | "poison";

interface FormulaSystemData extends ItemSystemData, ItemLevelData {
    craftDC: {
        value: number;
    };
    cost: {
        value: string;
    };
    craftingType: ValuesList<CraftingType>;
    fieldDiscoveryType: ValuesList<FieldDiscoveryType>;
    craftedObjectUuid: {
        value: CompendiumUUID;
    };
    alchemist?: {
        signatureItem?: boolean;
        perpetualInfusion?: boolean;
    };
}
