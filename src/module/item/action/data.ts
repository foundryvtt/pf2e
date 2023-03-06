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

interface ActionItemData
    extends Omit<ActionItemSource, "flags" | "system" | "type">,
        BaseItemDataPF2e<ActionItemPF2e, "action", ActionItemSource> {}

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

export { ActionItemSource, ActionItemData, ActionSystemData, ActionTrait, ActionTraits };
