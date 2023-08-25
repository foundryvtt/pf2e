import { CreatureTrait } from "@actor/creature/types.ts";
import { ActionTrait } from "@item/ability/types.ts";
import { KingmakerTrait } from "@item/campaign-feature/types.ts";
import { NPCAttackTrait } from "@item/melee/data.ts";
import { PhysicalItemTrait } from "@item/physical/data.ts";
import { DocumentSchemaRecord, OneToThree, Rarity } from "@module/data.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { ItemType } from "./index.ts";

interface BaseItemSourcePF2e<TType extends ItemType, TSystemSource extends ItemSystemSource = ItemSystemSource>
    extends foundry.documents.ItemSource<TType, TSystemSource> {
    flags: ItemSourceFlagsPF2e;
}

type ItemTrait = ActionTrait | CreatureTrait | PhysicalItemTrait | NPCAttackTrait | KingmakerTrait;

type ActionType = keyof ConfigPF2e["PF2E"]["actionTypes"];

interface ActionCost {
    type: Exclude<ActionType, "passive">;
    value: OneToThree | null;
}

interface ItemTraits<T extends ItemTrait = ItemTrait> {
    value: T[];
    rarity?: Rarity;
}

interface ItemFlagsPF2e extends foundry.documents.ItemFlags {
    pf2e: {
        rulesSelections: Record<string, string | number | object | null>;
        itemGrants: Record<string, ItemGrantData>;
        grantedBy: ItemGrantData | null;
        [key: string]: unknown;
    };
}

interface ItemSourceFlagsPF2e extends DeepPartial<foundry.documents.ItemFlags> {
    pf2e?: {
        rulesSelections?: Record<string, string | number | object>;
        itemGrants?: Record<string, ItemGrantSource>;
        grantedBy?: ItemGrantSource | null;
        [key: string]: unknown;
    };
}

type ItemGrantData = Required<ItemGrantSource>;

interface ItemGrantSource {
    /** The ID of a granting or granted item */
    id: string;
    /** The action taken when the user attempts to delete the item referenced by `id` */
    onDelete?: ItemGrantDeleteAction;
}

type ItemGrantDeleteAction = "cascade" | "detach" | "restrict";

interface ItemSystemSource {
    level?: { value: number };
    description: {
        gm: string;
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

type FrequencyInterval = keyof ConfigPF2e["PF2E"]["frequencies"];

interface FrequencySource {
    value?: number;
    max: number;
    /** Gap between recharges as an ISO8601 duration, or "day" for daily prep. */
    per: FrequencyInterval;
}

interface Frequency extends FrequencySource {
    value: number;
}

export {
    ActionCost,
    ActionType,
    BaseItemSourcePF2e,
    Frequency,
    FrequencyInterval,
    FrequencySource,
    ItemFlagsPF2e,
    ItemGrantData,
    ItemGrantDeleteAction,
    ItemGrantSource,
    ItemSystemData,
    ItemSystemSource,
    ItemTrait,
    ItemTraits,
};
