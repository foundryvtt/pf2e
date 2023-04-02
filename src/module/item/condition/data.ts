import { BaseItemSourcePF2e, ItemSystemData, ItemSystemSource } from "@item/data/base";
import { DamageType } from "@system/damage";
import { DamageRoll } from "@system/damage/roll";
import { ConditionSlug } from "./types";

type ConditionSource = BaseItemSourcePF2e<"condition", ConditionSystemSource>;

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
    context?: never;
    level?: never;
    traits?: never;
}

interface ConditionSystemData extends ConditionSystemSource, Omit<ItemSystemData, "level" | "slug" | "traits"> {
    persistent?: PersistentDamageData;
}

interface PersistentDamageData extends PersistentSourceData {
    damage: DamageRoll;
    expectedValue: number;
}

type ConditionValueData = { isValued: true; value: number } | { isValued: false; value: null };

interface PersistentSourceData {
    formula: string;
    damageType: DamageType;
    dc: number;
}

export { ConditionSource, ConditionSystemData, ConditionSystemSource, PersistentDamageData, PersistentSourceData };
