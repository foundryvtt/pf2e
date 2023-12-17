import {
    AbstractEffectSystemData,
    AbstractEffectSystemSource,
    DurationData,
    EffectAuraData,
    EffectBadge,
    EffectBadgeSource,
    EffectContextData,
    EffectTraits,
} from "@item/abstract-effect/index.ts";
import { BaseItemSourcePF2e, ItemFlagsPF2e } from "@item/base/data/system.ts";

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
    duration: DurationData & {
        sustained: boolean;
    };
    tokenIcon: {
        show: boolean;
    };
    unidentified: boolean;
    /** A numeric value or dice expression of some rules significance to the effect */
    badge: EffectBadgeSource | null;
    /** Origin, target, and roll context of the action that spawned this effect */
    context: EffectContextData | null;
}

interface EffectSystemData extends Omit<EffectSystemSource, "fromSpell">, Omit<AbstractEffectSystemData, "level"> {
    expired: boolean;
    badge: EffectBadge | null;
    remaining: string;
}

export type { EffectFlags, EffectSource, EffectSystemData };
