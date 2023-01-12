import { CreatureTrait } from "@actor/creature/data";
import type { ItemPF2e } from "@item/base";
import type { ActiveEffectPF2e } from "@module/active-effect";
import { RuleElementSource } from "@module/rules";
import { DocumentSchemaRecord, OneToThree, TraitsWithRarity } from "@module/data";
import { ItemType } from ".";
import { PhysicalItemTrait } from "../physical/data";
import { NPCAttackTrait } from "@item/melee/data";
import { ActionTrait } from "@item/action/data";

interface BaseItemSourcePF2e<
    TType extends ItemType = ItemType,
    TSystemSource extends ItemSystemSource = ItemSystemSource
> extends foundry.data.ItemSource<TType, TSystemSource> {
    flags: ItemSourceFlagsPF2e;
}

interface BaseItemDataPF2e<
    TItem extends ItemPF2e = ItemPF2e,
    TType extends ItemType = ItemType,
    TSystemData extends ItemSystemData = ItemSystemData,
    TSource extends BaseItemSourcePF2e<TType> = BaseItemSourcePF2e<TType>
> extends Omit<BaseItemSourcePF2e<TType, ItemSystemSource>, "system" | "effects">,
        foundry.data.ItemData<TItem, ActiveEffectPF2e> {
    readonly type: TType;
    readonly system: TSystemData;
    flags: ItemFlagsPF2e;

    readonly _source: TSource;
}

type ItemTrait = ActionTrait | CreatureTrait | PhysicalItemTrait | NPCAttackTrait;

type ActionType = keyof ConfigPF2e["PF2E"]["actionTypes"];

interface ActionCost {
    type: Exclude<ActionType, "passive">;
    value: OneToThree | null;
}

type ItemTraits<T extends ItemTrait = ItemTrait> = TraitsWithRarity<T>;

interface ItemFlagsPF2e extends foundry.data.ItemFlags {
    pf2e: {
        rulesSelections: Record<string, string | number | object>;
        itemGrants: Record<string, ItemGrantData>;
        grantedBy: ItemGrantData | null;
        [key: string]: unknown;
    };
}

interface ItemSourceFlagsPF2e extends DeepPartial<foundry.data.ItemFlags> {
    pf2e?: {
        rulesSelections?: Record<string, string | number | object>;
        itemGrants?: Record<string, ItemGrantSource>;
        grantedBy?: ItemGrantSource | null;
        [key: string]: unknown;
    };
}

type ItemGrantData = Required<ItemGrantSource>;

interface ItemGrantSource {
    id: string;
    onDelete?: ItemGrantDeleteAction;
}

type ItemGrantDeleteAction = "cascade" | "detach" | "restrict";

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

interface FrequencySource {
    value?: number;
    max: number;
    /** Gap between recharges as an ISO8601 duration, or "day" for daily prep. */
    per: keyof ConfigPF2e["PF2E"]["frequencies"];
}

interface Frequency extends FrequencySource {
    value: number;
}

export {
    ActionCost,
    ActionType,
    BaseItemDataPF2e,
    BaseItemSourcePF2e,
    Frequency,
    FrequencySource,
    ItemFlagsPF2e,
    ItemGrantData,
    ItemGrantDeleteAction,
    ItemGrantSource,
    ItemLevelData,
    ItemSystemData,
    ItemSystemSource,
    ItemTrait,
    ItemTraits,
};
