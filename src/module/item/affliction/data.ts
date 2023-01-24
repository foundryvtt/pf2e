import { SaveType } from "@actor/types";
import { ABCSystemData } from "@item/abc/data";
import { TimeUnit } from "@item/abstract-effect/data";
import { ActionTraits } from "@item/action/data";
import { ConditionSlug } from "@item/condition";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemData, ItemSystemSource } from "@item/data/base";
import { DamageCategoryUnique, DamageType } from "@system/damage";
import { AfflictionPF2e } from "./document";

type AfflictionSource = BaseItemSourcePF2e<"affliction", AfflictionSystemSource>;

type AfflictionData = Omit<AfflictionSource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<AfflictionPF2e, "affliction", AfflictionSystemData, AfflictionSource>;

interface AfflictionSystemSource extends ItemSystemSource {
    traits: ActionTraits;
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
    };
}

interface AfflictionSystemData extends AfflictionSystemSource, Omit<ItemSystemData, "traits"> {}

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

interface AfflictionSystemData extends Omit<AfflictionSystemSource, "items">, Omit<ABCSystemData, "traits"> {}

export {
    AfflictionConditionData,
    AfflictionDamage,
    AfflictionData,
    AfflictionOnset,
    AfflictionSource,
    AfflictionStageData,
    AfflictionSystemData,
};
