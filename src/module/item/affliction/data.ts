import { SaveType } from "@actor/types.ts";
import {
    AbstractEffectWithDurationSystemData,
    AbstractEffectWithDurationSystemSource,
    AbstractEffectExpiryType,
    EffectAuraData,
    EffectContextData,
    EffectTraits,
    TimeUnit,
} from "@item/abstract-effect/index.ts";
import { ConditionSlug } from "@item/condition/index.ts";
import { BaseItemSourcePF2e, ItemFlagsPF2e } from "@item/data/base.ts";
import { DamageCategoryUnique, DamageType } from "@system/damage/index.ts";

type AfflictionSource = BaseItemSourcePF2e<"affliction", AfflictionSystemSource> & {
    flags: DeepPartial<AfflictionFlags>;
};

type AfflictionFlags = ItemFlagsPF2e & {
    pf2e: {
        aura?: EffectAuraData;
    };
};

interface AfflictionSystemSource extends AbstractEffectWithDurationSystemSource {
    level: { value: number };
    traits: EffectTraits;
    save: {
        type: SaveType;
        value: number;
    };
    stage: number;
    stages: Record<string, AfflictionStageData>;
    onset?: AfflictionOnset;
    start: {
        value: number;
        initiative: number | null;
    };
    stageStart: {
        value: number;
        initiative: number | null;
    };
    unidentified: boolean;
    /** Origin, target, and roll context of the action that spawned this effect */
    context: EffectContextData | null;
}

interface AfflictionSystemData
    extends Omit<AfflictionSystemSource, "fromSpell">,
        Omit<AbstractEffectWithDurationSystemData, "level" | "traits"> {}

interface AfflictionOnset {
    value: number;
    unit: TimeUnit;
}

interface AfflictionDamage {
    formula: string;
    type: DamageType;
    category?: DamageCategoryUnique | null;
}

interface AfflictionStageData {
    damage: Record<string, AfflictionDamage>;
    conditions: Record<string, AfflictionConditionData>;
    effects: AfflictionEffectData[];
    duration: AfflictionDuration;
}

interface AfflictionDuration {
    value: number;
    unit: TimeUnit | "unlimited";
    expiry: AbstractEffectExpiryType | null;
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

export type {
    AfflictionConditionData,
    AfflictionDamage,
    AfflictionFlags,
    AfflictionOnset,
    AfflictionSource,
    AfflictionStageData,
    AfflictionSystemData,
};
