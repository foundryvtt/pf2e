import type { ItemPF2e } from "@item/base";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemData } from "./base";

export type NonPhysicalItemType =
    | "action"
    | "ancestry"
    | "background"
    | "class"
    | "condition"
    | "effect"
    | "feat"
    | "kit"
    | "lore"
    | "martial"
    | "melee"
    | "spell"
    | "spellcastingEntry"
    | "formula"
    | "craftingEntry";

export type BaseNonPhysicalItemSource<
    TItemType extends NonPhysicalItemType = NonPhysicalItemType,
    TSystemData extends ItemSystemData = ItemSystemData
> = BaseItemSourcePF2e<TItemType, TSystemData>;

export class BaseNonPhysicalItemData<TItem extends ItemPF2e = ItemPF2e> extends BaseItemDataPF2e<TItem> {
    readonly isPhysical: false = false;
}

export interface BaseNonPhysicalItemData<TItem extends ItemPF2e = ItemPF2e>
    extends Omit<BaseNonPhysicalItemSource, "effects"> {
    type: BaseNonPhysicalItemSource["type"];
    data: BaseNonPhysicalItemSource["data"];

    readonly document: TItem;
}
