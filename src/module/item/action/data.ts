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
import { ActionTrait } from "./types.ts";

type ActionItemSource = BaseItemSourcePF2e<"action", ActionSystemSource>;

interface ActionTraits extends ItemTraits<ActionTrait> {
    rarity?: never;
}

interface ActionSystemSource extends ItemSystemSource {
    traits: ActionTraits;
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

interface ActionSystemData extends ActionSystemSource, Omit<ItemSystemData, "level" | "traits"> {
    frequency?: Frequency;
}

type ActionCategory = keyof ConfigPF2e["PF2E"]["actionCategories"];

export { ActionCategory, ActionItemSource, ActionSystemData, ActionTraits };
