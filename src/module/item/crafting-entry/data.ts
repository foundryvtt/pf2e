import { ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { PhysicalItemTrait } from "@item/physical/data";
import { CraftingEntryPF2e } from ".";

export type CraftingEntrySource = BaseNonPhysicalItemSource<"craftingEntry", CraftingEntrySystemData>;

export class CraftingEntryData extends BaseNonPhysicalItemData<CraftingEntryPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/craftingEntry.svg";
}

export interface CraftingEntryData extends Omit<CraftingEntrySource, "_id" | "effects"> {
    type: CraftingEntrySource["type"];
    data: CraftingEntrySource["data"];
    readonly _source: CraftingEntrySource;
}

export type EntryType = "alchemical" | "snare" | "scroll" | "custom";

export interface FormulaPrepData {
    id: string;
    quantity?: number;
    expended?: boolean;
}

export interface CraftingSlotData {
    prepared: FormulaPrepData[];
    max?: number;
}

export interface ItemRestrictions {
    traits?: PhysicalItemTrait[];
    level?: number;
    specificItems?: string[];
}

export interface CraftingEntrySystemData extends ItemSystemData {
    entryType: {
        value: EntryType;
    };
    entrySelector: {
        value: string;
    };
    slots: CraftingSlotData;
    itemRestrictions?: ItemRestrictions;
}
