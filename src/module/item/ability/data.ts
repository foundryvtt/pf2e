import {
    ActionType,
    BaseItemSourcePF2e,
    Frequency,
    FrequencySource,
    ItemSystemData,
    ItemSystemSource,
    ItemTraits,
} from "@item/data/base.ts";
import { OneToThree } from "@module/data.ts";
import { ActionCategory, ActionTrait } from "./types.ts";

type AbilityItemSource = BaseItemSourcePF2e<"action", AbilitySystemSource>;

interface AbilityTraits extends ItemTraits<ActionTrait> {
    rarity?: never;
}

interface AbilitySystemSource extends ItemSystemSource {
    traits: AbilityTraits;
    actionType: {
        value: ActionType;
    };
    actions: {
        value: OneToThree | null;
    };
    category: ActionCategory | null;
    requirements: {
        value: string;
    };
    trigger: {
        value: string;
    };
    deathNote: boolean;
    frequency?: FrequencySource;
    level?: never;
}

interface AbilitySystemData extends AbilitySystemSource, Omit<ItemSystemData, "level" | "traits"> {
    frequency?: Frequency;
}

export { AbilityItemSource, AbilitySystemData, AbilityTraits };
