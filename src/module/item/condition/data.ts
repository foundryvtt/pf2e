import { CONDITION_SLUGS } from "@actor/values";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemData, ItemSystemSource } from "@item/data/base";
import { DamageType } from "@system/damage";
import { DamageRoll } from "@system/damage/roll";
import { ConditionPF2e } from ".";

type ConditionSource = BaseItemSourcePF2e<"condition", ConditionSystemSource>;

type ConditionData = Omit<ConditionSource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<ConditionPF2e, "condition", ConditionSystemData, ConditionSource>;

interface ConditionSystemSource extends ItemSystemSource {
    slug: ConditionSlug;
    references: {
        parent?: {
            id: string;
            type: string;
        };
        children: { id: string; type: "condition" }[];
        overriddenBy: { id: string; type: "condition" }[];
        overrides: { id: string; type: "condition" }[];
    };
    duration: { value: number };
    persistent?: PersistentSourceData;
    group: string | null;
    value: ConditionValueData;
    overrides: string[];
    traits?: never;
}

interface ConditionSystemData extends ConditionSystemSource, Omit<ItemSystemData, "traits" | "slug"> {
    persistent?: PersistentDamageData;
}

interface PersistentDamageData extends PersistentSourceData {
    damage: DamageRoll;
    expectedValue: number;
}

type ConditionValueData = { isValued: true; value: number } | { isValued: false; value: null };

type ConditionSlug = SetElement<typeof CONDITION_SLUGS>;
type ConditionKey = ConditionSlug | `persistent-damage-${string}`;

interface PersistentSourceData {
    formula: string;
    damageType: DamageType;
    dc: number;
}

export {
    ConditionData,
    ConditionKey,
    ConditionSlug,
    ConditionSource,
    ConditionSystemData,
    ConditionSystemSource,
    PersistentDamageData,
    PersistentSourceData,
};
