import { EffectAuraData, EffectBadge, EffectContextData, EffectTraits, TimeUnit } from "@item/abstract-effect";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemFlagsPF2e, ItemSystemData, ItemSystemSource } from "@item/data/base";
import { EffectPF2e } from ".";

type EffectSource = BaseItemSourcePF2e<"effect", EffectSystemSource> & {
    flags: DeepPartial<EffectFlags>;
};

interface EffectData
    extends Omit<EffectSource, "flags" | "system" | "type">,
        BaseItemDataPF2e<EffectPF2e, "effect", EffectSource> {}

type EffectFlags = ItemFlagsPF2e & {
    pf2e: {
        aura?: EffectAuraData;
    };
};

interface EffectSystemSource extends ItemSystemSource {
    level: { value: number };
    traits: EffectTraits;
    start: {
        value: number;
        initiative: number | null;
    };
    duration: {
        value: number;
        unit: TimeUnit | "unlimited" | "encounter";
        sustained: boolean;
        expiry: EffectExpiryType | null;
    };
    tokenIcon: {
        show: boolean;
    };
    unidentified: boolean;
    target: string | null;
    expired?: boolean;
    /** A numeric value or dice expression of some rules significance to the effect */
    badge: EffectBadge | null;
    /** Origin, target, and roll context of the action that spawned this effect */
    context: EffectContextData | null;
}

interface EffectSystemData extends EffectSystemSource, Omit<ItemSystemData, "level" | "traits"> {
    expired: boolean;
    remaining: string;
}

type EffectExpiryType = "turn-start" | "turn-end";

export { EffectData, EffectExpiryType, EffectFlags, EffectSource, EffectSystemData };
