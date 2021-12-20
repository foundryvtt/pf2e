import { ItemLevelData, ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { OneToFour } from "@module/data";
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
    badge: EffectBadge | null;
}

export interface EffectBadge {
    value: number | DiceExpression;
    tickRule: EffectTickType;
}

export type EffectExpiryType = "turn-start" | "turn-end";

export type EffectTickType = "turn-start";

type DieFaceCount = 4 | 6 | 8 | 10 | 12 | 20;
export type DiceExpression = `${OneToFour | ""}d${DieFaceCount}`;

export interface EffectSystemData extends ItemSystemData, EffectSystemSource {
    expired: boolean;
    remaining: string;
}
