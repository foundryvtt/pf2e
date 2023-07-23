import {
    AbstractEffectSystemData,
    AbstractEffectSystemSource,
    EffectAuraData,
    EffectBadge,
    EffectBadgeSource,
    EffectContextData,
    EffectTraits,
    TimeUnit,
} from "@item/abstract-effect/index.ts";
import { BaseItemSourcePF2e, ItemFlagsPF2e } from "@item/data/base.ts";

type EffectSource = BaseItemSourcePF2e<"effect", EffectSystemSource> & {
    flags: DeepPartial<EffectFlags>;
};

type EffectFlags = ItemFlagsPF2e & {
    pf2e: {
        aura?: EffectAuraData;
    };
};

interface EffectSystemSource extends AbstractEffectSystemSource {
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
    expired?: boolean;
    /** A numeric value or dice expression of some rules significance to the effect */
    badge: EffectBadgeSource | null;
    /** Origin, target, and roll context of the action that spawned this effect */
    context: EffectContextData | null;
}

interface EffectSystemData
    extends Omit<EffectSystemSource, "fromSpell">,
        Omit<AbstractEffectSystemData, "level" | "traits"> {
    expired: boolean;
    badge: EffectBadge | null;
    remaining: string;
}

type EffectExpiryType = "turn-start" | "turn-end";

export { EffectExpiryType, EffectFlags, EffectSource, EffectSystemData };
