import { CreatureTrait } from "@actor/creature/data";
import type { ItemPF2e } from "@item/base";
import type { ActiveEffectPF2e } from "@module/active-effect";
import { RuleElementSource } from "@module/rules";
import { DocumentSchemaRecord, OneToThree, Rarity, ValuesList } from "@module/data";
import { ItemType } from ".";
import { PhysicalItemTrait } from "../physical/data";
import { NPCAttackTrait } from "@item/melee/data";
import { ActionTrait } from "@item/action/data";

interface BaseItemSourcePF2e<
    TItemType extends ItemType = ItemType,
    TSystemSource extends ItemSystemSource = ItemSystemSource
> extends foundry.data.ItemSource {
    type: TItemType;
    data: TSystemSource;
    flags: DeepPartial<ItemFlagsPF2e>;
}

abstract class BaseItemDataPF2e<TItem extends ItemPF2e = ItemPF2e> extends foundry.data.ItemData<
    TItem,
    ActiveEffectPF2e
> {}

interface BaseItemDataPF2e extends Omit<BaseItemSourcePF2e, "effects"> {
    type: ItemType;
    data: ItemSystemData;
    flags: ItemFlagsPF2e;

    readonly _source: BaseItemSourcePF2e;
}

type ItemTrait = ActionTrait | CreatureTrait | PhysicalItemTrait | NPCAttackTrait;

type ActionType = keyof ConfigPF2e["PF2E"]["actionTypes"];

interface ActionCost {
    type: ActionType;
    value: OneToThree | null;
}

interface ItemTraits<T extends ItemTrait = ItemTrait> extends ValuesList<T> {
    rarity: Rarity;
}

interface ItemFlagsPF2e extends foundry.data.ItemFlags {
    pf2e: {
        rulesSelections: Record<string, string | number | object>;
        itemGrants: string[];
        grantedBy: string | null;
        [key: string]: unknown;
    };
}

interface ItemLevelData {
    level: {
        value: number;
    };
}

interface ItemSystemSource {
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

type ItemSystemData = ItemSystemSource;

export {
    ActionCost,
    ActionType,
    BaseItemDataPF2e,
    BaseItemSourcePF2e,
    ItemFlagsPF2e,
    ItemLevelData,
    ItemSystemData,
    ItemSystemSource,
    ItemTraits,
};
