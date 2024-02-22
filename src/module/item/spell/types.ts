import type { EFFECT_AREA_SHAPES, MAGIC_TRADITIONS } from "./values.ts";

type MagicTradition = SetElement<typeof MAGIC_TRADITIONS>;
type SpellTrait = keyof typeof CONFIG.PF2E.spellTraits;
type EffectAreaShape = (typeof EFFECT_AREA_SHAPES)[number];

export type { EffectAreaShape, MagicTradition, SpellTrait };
