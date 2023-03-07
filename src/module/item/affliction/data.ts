import { SaveType } from "@actor/types";
import { EffectAuraData, EffectContextData, EffectTraits, TimeUnit } from "@item/abstract-effect";
import { ConditionSlug } from "@item/condition";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemFlagsPF2e, ItemSystemData, ItemSystemSource } from "@item/data/base";
import { DamageCategoryUnique, DamageType } from "@system/damage";
import { AfflictionPF2e } from "./document";

type AfflictionSource = BaseItemSourcePF2e<"affliction", AfflictionSystemSource> & {
    flags: DeepPartial<AfflictionFlags>;
};

interface AfflictionData
    extends Omit<AfflictionSource, "flags" | "system" | "type">,
        BaseItemDataPF2e<AfflictionPF2e, "affliction", AfflictionSource> {}

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
    effects: {
        uuid: ItemUUID;
    }[];
}

interface AfflictionConditionData {
    slug: ConditionSlug;
    value?: number;
}

export {
    AfflictionConditionData,
    AfflictionDamage,
    AfflictionData,
    AfflictionFlags,
    AfflictionOnset,
    AfflictionSource,
    AfflictionStageData,
    AfflictionSystemData,
};
