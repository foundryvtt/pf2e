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

type ActionItemSource = BaseItemSourcePF2e<"action", ActionSystemSource>;

type ActionTrait = keyof ConfigPF2e["PF2E"]["actionTraits"];
interface ActionTraits extends ItemTraits<ActionTrait> {
    rarity?: never;
}

interface ActionSystemSource extends ItemSystemSource {
    traits: ActionTraits;
    actionType: {
        value: ActionType;
    };
    actionCategory: {
        value: string;
    };
    actions: {
        value: OneToThree | null;
    };
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

export { ActionItemSource, ActionSystemData, ActionTrait, ActionTraits };
