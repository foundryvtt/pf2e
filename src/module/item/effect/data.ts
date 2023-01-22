import { EffectBadge } from "@item/abstract-effect";
import { TimeUnit } from "@item/abstract-effect/data";
import {
    BaseItemDataPF2e,
    BaseItemSourcePF2e,
    ItemFlagsPF2e,
    ItemLevelData,
    ItemSystemData,
    ItemSystemSource,
} from "@item/data/base";
import { CheckRoll } from "@system/check";
import { EffectPF2e } from ".";

type EffectSource = BaseItemSourcePF2e<"effect", EffectSystemSource> & {
    flags: DeepPartial<EffectFlags>;
};

type EffectData = Omit<EffectSource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<EffectPF2e, "effect", EffectSystemData, EffectSource> & {
        flags: EffectFlags;
    };

type EffectFlags = ItemFlagsPF2e & {
    pf2e: {
        aura?: EffectAuraData;
    };
};

interface EffectSystemSource extends ItemSystemSource, ItemLevelData {
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

interface EffectSystemData extends EffectSystemSource, ItemSystemData {
    expired: boolean;
    remaining: string;
}

type EffectExpiryType = "turn-start" | "turn-end";

interface EffectAuraData {
    slug: string;
    origin: ActorUUID | TokenDocumentUUID;
    removeOnExit: boolean;
}

interface EffectContextData {
    origin: {
        actor: ActorUUID | TokenDocumentUUID;
        token: TokenDocumentUUID | null;
    };
    target: {
        actor: ActorUUID | TokenDocumentUUID;
        token: TokenDocumentUUID | null;
    } | null;
    roll: Pick<CheckRoll, "total" | "degreeOfSuccess"> | null;
}

export { EffectData, EffectExpiryType, EffectFlags, EffectContextData, EffectSource, EffectSystemData };
