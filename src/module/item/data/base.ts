import { CreatureTrait } from "@actor/creature/data";
import type { ItemPF2e } from "@item/base";
import type { ActiveEffectPF2e } from "@module/active-effect";
import { RuleElementSource } from "@module/rules/rules-data-definitions";
import { DocumentSchemaRecord, OneToThree, Rarity, ValuesList } from "@module/data";
import { ItemType } from ".";
import { PhysicalItemTrait } from "../physical/data";
import { NPCAttackTrait } from "@item/melee/data";
import { ActionTrait } from "@item/action/data";

export interface BaseItemSourcePF2e<
    TItemType extends ItemType = ItemType,
    TSystemData extends ItemSystemData = ItemSystemData
> extends foundry.data.ItemSource {
    type: TItemType;
    data: TSystemData;
    flags: DeepPartial<ItemFlagsPF2e>;
}

export abstract class BaseItemDataPF2e<TItem extends ItemPF2e = ItemPF2e> extends foundry.data.ItemData<
    TItem,
    ActiveEffectPF2e
> {
    /** Is this physical item data? */
    abstract isPhysical: boolean;
}

export interface BaseItemDataPF2e extends Omit<BaseItemSourcePF2e, "effects"> {
    type: ItemType;
    data: ItemSystemData;
    flags: ItemFlagsPF2e;

    readonly _source: BaseItemSourcePF2e;
}

export type ItemTrait = ActionTrait | CreatureTrait | PhysicalItemTrait | NPCAttackTrait;

export type ActionType = keyof ConfigPF2e["PF2E"]["actionTypes"];

export interface ActionCost {
    type: ActionType;
    value: OneToThree | null;
}

export interface ItemTraits<T extends ItemTrait = ItemTrait> extends ValuesList<T> {
    rarity: { value: Rarity };
}

export interface ItemFlagsPF2e extends foundry.data.ItemFlags {
    pf2e: {
        rulesSelections: Record<string, string>;
        itemGrants: string[];
        grantedBy: string | null;
        [key: string]: unknown;
    };
}

export interface ItemLevelData {
    level: {
        value: number;
    };
}

export interface ItemSystemData {
    description: {
        value: string;
    };
    source: {
        value: string;
    };
    traits?: ItemTraits;
    options?: {
        value: string[];
    };
    rules: RuleElementSource[];
    slug: string | null;
    schema: DocumentSchemaRecord;
}
