import { ActionTrait } from "@item/action/index.ts";
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

interface EffectBadgeCounterSource {
    type: "counter";
    max?: number;
    value: number;
    labels?: string[];
}

interface EffectBadgeCounter extends EffectBadgeCounterSource {
    max: number;
    label: string | null;
}

interface EffectTraits {
    value: EffectTrait[];
    rarity?: never;
    custom?: never;
}

type EffectTrait = ActionTrait | SpellTrait;

// currently unused until specifices can be figured out
interface EffectBadgeValue {
    type?: "value";
    value: number | string;
    reevaluate?: { formula: string; event: "turn-start" } | null;
}

interface EffectBadgeFormula {
    type: "formula";
    value: string;
    evaluate?: boolean;
    reevaluate?: "turn-start" | null;
}

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

type EffectBadgeSource = EffectBadgeCounterSource | EffectBadgeValue | EffectBadgeFormula;
type EffectBadge = EffectBadgeCounter | EffectBadgeValue | EffectBadgeFormula;

type TimeUnit = "rounds" | "minutes" | "hours" | "days";

export {
    AbstractEffectSystemData,
    AbstractEffectSystemSource,
    EffectAuraData,
    EffectBadge,
    EffectBadgeFormula,
    EffectBadgeSource,
    EffectBadgeValue,
    EffectContextData,
    EffectTrait,
    EffectTraits,
    TimeUnit,
};
