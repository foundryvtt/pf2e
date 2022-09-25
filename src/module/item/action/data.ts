import {
    ActionType,
    BaseItemDataPF2e,
    BaseItemSourcePF2e,
    Frequency,
    FrequencySource,
    ItemSystemData,
    ItemSystemSource,
    ItemTraits,
} from "@item/data/base";
import { ActionItemPF2e } from ".";
import { OneToThree } from "@module/data";

type ActionItemSource = BaseItemSourcePF2e<"action", ActionSystemSource>;

type ActionItemData = Omit<ActionItemSource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<ActionItemPF2e, "action", ActionSystemData, ActionItemSource>;

type ActionTrait = keyof ConfigPF2e["PF2E"]["actionTraits"];
type ActionTraits = ItemTraits<ActionTrait>;

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
}

interface ActionSystemData extends ActionSystemSource, Omit<ItemSystemData, "traits"> {
    frequency?: Frequency;
}

export { ActionItemSource, ActionItemData, ActionTrait, ActionTraits };
