import { ActionType, ItemSystemData, ItemTraits } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { ActionPF2e } from ".";
import { OneToThree } from "@module/data";

export type ActionSource = BaseNonPhysicalItemSource<"action", ActionSystemData>;

export class ActionData extends BaseNonPhysicalItemData<ActionPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/action.svg";
}

export interface ActionData extends Omit<ActionSource, "effects" | "flags"> {
    type: ActionSource["type"];
    data: ActionSource["data"];
    readonly _source: ActionSource;
}

export type ActionTrait = keyof ConfigPF2e["PF2E"]["actionTraits"];
export type ActionTraits = ItemTraits<ActionTrait>;

interface ActionSystemData extends ItemSystemData {
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
}
