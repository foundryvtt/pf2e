import { ItemLevelData, ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { EffectPF2e } from ".";

export type EffectSource = BaseNonPhysicalItemSource<"effect", EffectSystemSource>;

export class EffectData extends BaseNonPhysicalItemData<EffectPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/effect.svg";
}

export interface EffectData extends Omit<EffectSource, "effects" | "flags"> {
    type: EffectSource["type"];
    data: EffectSystemData;
    readonly _source: EffectSource;
}

interface EffectSystemSource extends ItemSystemData, ItemLevelData {
    expired: boolean;
    remaining: string;
    start?: {
        value: number;
        initiative: number | null;
    };
    tokenIcon: {
        show: boolean;
    };
    target?: string;
}

export interface EffectSystemData extends ItemSystemData, EffectSystemSource {
    duration: {
        value: number;
        unit: string;
        sustained: boolean;
        expiry: "turn-start" | "turn-end";
    };
    start: {
        value: number;
        initiative: number | null;
    };
}
