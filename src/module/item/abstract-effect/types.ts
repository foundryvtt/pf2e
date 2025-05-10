import { EFFECT_TIME_UNITS } from "./values.ts";

type EffectTrait = keyof typeof CONFIG.PF2E.effectTraits;
type TimeUnit = (typeof EFFECT_TIME_UNITS)[number];
type EffectExpiryType = "turn-start" | "turn-end" | "round-end";
type BadgeReevaluationEventType = "initiative-roll" | "turn-start" | "turn-end";

export type { BadgeReevaluationEventType, EffectExpiryType, EffectTrait, TimeUnit };
