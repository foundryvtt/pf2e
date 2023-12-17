import { AttributeString } from "@actor/types.ts";
import { ActionTrait } from "@item/ability/types.ts";
import { ItemSystemData, ItemSystemSource, ItemTraitsNoRarity } from "@item/base/data/system.ts";
import { MagicTradition, SpellTrait } from "@item/spell/index.ts";
import type { CheckRoll } from "@system/check/index.ts";

interface AbstractEffectSystemSource extends ItemSystemSource {
    /** Whether this effect originated from a spell */
    fromSpell?: boolean;
    expired?: boolean;
}

interface AbstractEffectSystemData extends ItemSystemData {
    traits: EffectTraits;
    /** Whether this effect originated from a spell */
    fromSpell: boolean;
}

interface EffectBadgeBaseSource {
    labels?: string[];
}

interface EffectBadgeBase extends EffectBadgeBaseSource {
    label: string | null;
}

interface EffectBadgeCounterSource extends EffectBadgeBaseSource {
    type: "counter";
    min?: number;
    max?: number;
    value: number;
}

interface EffectBadgeCounter extends EffectBadgeCounterSource, EffectBadgeBase {
    min: number;
    max: number;
}

interface EffectTraits extends ItemTraitsNoRarity<EffectTrait> {}

type EffectTrait = ActionTrait | SpellTrait;

/** A static value, including the result of a formula badge */
interface EffectBadgeValueSource extends EffectBadgeBaseSource {
    type: "value";
    value: number;
    reevaluate?: { formula: string; event: "turn-start" | "turn-end" } | null;
}

interface EffectBadgeValue extends EffectBadgeValueSource, EffectBadgeBase {
    min: number;
    max: number;
}

interface EffectBadgeFormulaSource extends EffectBadgeBaseSource {
    type: "formula";
    value: string;
    evaluate?: boolean;
    reevaluate?: "turn-start" | "turn-end" | null;
}

interface EffectBadgeFormula extends EffectBadgeFormulaSource, EffectBadgeBase {}

interface EffectContextData {
    origin: {
        actor: ActorUUID;
        token: TokenDocumentUUID | null;
        item: ItemUUID | null;
        spellcasting: EffectContextSpellcastingData | null;
    };
    target: {
        actor: ActorUUID;
        token: TokenDocumentUUID | null;
    } | null;
    roll: Pick<CheckRoll, "total" | "degreeOfSuccess"> | null;
}

interface EffectContextSpellcastingData {
    attribute: { type: AttributeString; mod: number };
    tradition: MagicTradition | null;
}

interface EffectAuraData {
    slug: string;
    origin: ActorUUID;
    removeOnExit: boolean;
}

type EffectBadgeSource = EffectBadgeCounterSource | EffectBadgeValueSource | EffectBadgeFormulaSource;
type EffectBadge = EffectBadgeCounter | EffectBadgeValue | EffectBadgeFormula;

type TimeUnit = "rounds" | "minutes" | "hours" | "days";
type EffectExpiryType = "turn-start" | "turn-end" | "round-end";

interface DurationData {
    value: number;
    unit: TimeUnit | "unlimited" | "encounter";
    expiry: EffectExpiryType | null;
}

export type {
    AbstractEffectSystemData,
    AbstractEffectSystemSource,
    DurationData,
    EffectAuraData,
    EffectBadge,
    EffectBadgeCounter,
    EffectBadgeFormulaSource,
    EffectBadgeSource,
    EffectBadgeValueSource,
    EffectContextData,
    EffectExpiryType,
    EffectTrait,
    EffectTraits,
    TimeUnit,
};
