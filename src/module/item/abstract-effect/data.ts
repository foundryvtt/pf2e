import { ActionTrait } from "@item/action";
import { SpellTrait } from "@item/spell";
import { CheckRoll } from "@system/check";

interface EffectBadgeCounter {
    type: "counter";
    value: number;
    label?: string;
    labels?: string[];
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
}

interface EffectBadgeFormula {
    type: "formula";
    value: string;
    evaluate?: boolean;
}

interface EffectContextData {
    origin: {
        actor: ActorUUID | TokenDocumentUUID;
        token: TokenDocumentUUID | null;
        item: ItemUUID | null;
    };
    target: {
        actor: ActorUUID | TokenDocumentUUID;
        token: TokenDocumentUUID | null;
    } | null;
    roll: Pick<CheckRoll, "total" | "degreeOfSuccess"> | null;
}

interface EffectAuraData {
    slug: string;
    origin: ActorUUID | TokenDocumentUUID;
    removeOnExit: boolean;
}

type EffectBadge = EffectBadgeCounter | EffectBadgeValue | EffectBadgeFormula;

type TimeUnit = "rounds" | "minutes" | "hours" | "days";

export { EffectAuraData, EffectBadge, EffectContextData, EffectTrait, EffectTraits, TimeUnit };
