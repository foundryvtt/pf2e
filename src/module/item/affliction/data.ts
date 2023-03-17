import { SaveType } from "@actor/types";
import { EffectAuraData, EffectContextData, EffectTraits, TimeUnit } from "@item/abstract-effect";
import { ConditionSlug } from "@item/condition";
import { BaseItemSourcePF2e, ItemFlagsPF2e, ItemSystemData, ItemSystemSource } from "@item/data/base";
import { DamageCategoryUnique, DamageType } from "@system/damage";

type AfflictionSource = BaseItemSourcePF2e<"affliction", AfflictionSystemSource> & {
    flags: DeepPartial<AfflictionFlags>;
};

type AfflictionFlags = ItemFlagsPF2e & {
    pf2e: {
        aura?: EffectAuraData;
    };
};

interface AfflictionSystemSource extends ItemSystemSource {
    level: { value: number };
    traits: EffectTraits;
    save: {
        type: SaveType;
        value: number;
    };
    stage: number;
    stages: Record<string, AfflictionStageData>;
    onset?: AfflictionOnset;
    duration: {
        value: number;
        unit: TimeUnit | "unlimited";
        expiry?: null;
    };
    /** Origin, target, and roll context of the action that spawned this effect */
    context: EffectContextData | null;
}

interface AfflictionSystemData extends AfflictionSystemSource, Omit<ItemSystemData, "level" | "traits"> {}

interface AfflictionOnset {
    value: number;
    unit: TimeUnit;
}

interface AfflictionDamage {
    value: string;
    type: DamageType;
    category?: DamageCategoryUnique;
}

interface AfflictionStageData {
    damage: Record<string, AfflictionDamage>;
    conditions: Record<string, AfflictionConditionData>;
    effects: AfflictionEffectData[];
}

interface AfflictionConditionData {
    slug: ConditionSlug;
    value?: number;
    /** Whether the condition should disappear when the stage changes. Defaults to true */
    linked?: boolean;
}

interface AfflictionEffectData {
    uuid: ItemUUID;
}

export {
    AfflictionConditionData,
    AfflictionDamage,
    AfflictionFlags,
    AfflictionOnset,
    AfflictionSource,
    AfflictionStageData,
    AfflictionSystemData,
};
