import { ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { ActionPF2e } from ".";
import { OneToThree } from "@module/data";

export type ActionType = keyof ConfigPF2e["PF2E"]["actionTypes"];

export type ActionSource = BaseNonPhysicalItemSource<"action", ActionSystemData>;

export class ActionData extends BaseNonPhysicalItemData<ActionPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/action.svg";
}

export interface ActionData extends Omit<ActionSource, "_id" | "effects"> {
    type: ActionSource["type"];
    data: ActionSource["data"];
    readonly _source: ActionSource;
}

interface ActionSystemData extends ItemSystemData {
    actionType: {
        value: ActionType;
    };
    actionCategory: {
        value: string;
    };
    weapon: {
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
