import type { ItemPF2e } from "@item/base";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemData } from "./base";

export type NonPhysicalItemType =
    | "action"
    | "ancestry"
    | "background"
    | "class"
    | "condition"
    | "deity"
    | "effect"
    | "feat"
    | "heritage"
    | "kit"
    | "lore"
    | "melee"
    | "spell"
    | "spellcastingEntry";

export type BaseNonPhysicalItemSource<
    TItemType extends NonPhysicalItemType = NonPhysicalItemType,
    TSystemData extends ItemSystemData = ItemSystemData
> = BaseItemSourcePF2e<TItemType, TSystemData>;

export class BaseNonPhysicalItemData<TItem extends ItemPF2e> extends BaseItemDataPF2e<TItem> {}

export interface BaseNonPhysicalItemData<TItem extends ItemPF2e>
    extends Omit<BaseNonPhysicalItemSource, "effects" | "flags"> {
    type: BaseNonPhysicalItemSource["type"];
    data: BaseNonPhysicalItemSource["data"];

    readonly document: TItem;
}
