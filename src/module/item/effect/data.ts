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
    start: {
        value: number;
        initiative: number | null;
    };
    duration: {
        value: number;
        unit: "rounds" | "minutes" | "hours" | "days" | "encounter" | "unlimited";
        sustained: boolean;
        expiry: EffectExpiryType | null;
    };
    tokenIcon: {
        show: boolean;
    };
    target: string | null;
    expired?: boolean;
}

export type EffectExpiryType = "turn-start" | "turn-end";

export interface EffectSystemData extends ItemSystemData, EffectSystemSource {
    expired: boolean;
    remaining: string;
}
