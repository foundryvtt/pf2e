import { ActionTrait } from "@item/action/types.ts";
import { ItemSystemData, ItemSystemSource } from "@item/data/base.ts";
import { SpellTrait } from "@item/spell/index.ts";
import { CheckRoll } from "@system/check/index.ts";

interface AbstractEffectSystemSource extends ItemSystemSource {
    /** Whether this effect originated from a spell */
    fromSpell?: boolean;
}

interface AbstractEffectSystemData extends ItemSystemData {
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
    max?: number;
    value: number;
}

interface EffectBadgeCounter extends EffectBadgeCounterSource, EffectBadgeBase {
    max: number;
}

interface EffectTraits {
    value: EffectTrait[];
    rarity?: never;
    custom?: never;
}

type EffectTrait = ActionTrait | SpellTrait;

/** A static value, including the result of a formula badge */
interface EffectBadgeValueSource extends EffectBadgeBaseSource {
    type: "value";
    value: number;
    reevaluate?: { formula: string; event: "turn-start" } | null;
}

interface EffectBadgeValue extends EffectBadgeValueSource, EffectBadgeBase {
    max: number;
}

interface EffectBadgeFormulaSource extends EffectBadgeBaseSource {
    type: "formula";
    value: string;
    evaluate?: boolean;
    reevaluate?: "turn-start" | null;
}

interface EffectBadgeFormula extends EffectBadgeFormulaSource, EffectBadgeBase {}

interface EffectContextData {
    origin: {
        actor: ActorUUID;
        token: TokenDocumentUUID | null;
        item: ItemUUID | null;
    };
    target: {
        actor: ActorUUID;
        token: TokenDocumentUUID | null;
    } | null;
    roll: Pick<CheckRoll, "total" | "degreeOfSuccess"> | null;
}

interface EffectAuraData {
    slug: string;
    origin: ActorUUID;
    removeOnExit: boolean;
}

type EffectBadgeSource = EffectBadgeCounterSource | EffectBadgeValueSource | EffectBadgeFormulaSource;
type EffectBadge = EffectBadgeCounter | EffectBadgeValue | EffectBadgeFormula;

type TimeUnit = "rounds" | "minutes" | "hours" | "days";

export {
    AbstractEffectSystemData,
    AbstractEffectSystemSource,
    EffectAuraData,
    EffectBadge,
    EffectBadgeFormulaSource,
    EffectBadgeSource,
    EffectBadgeValueSource,
    EffectContextData,
    EffectTrait,
    EffectTraits,
    TimeUnit,
};
