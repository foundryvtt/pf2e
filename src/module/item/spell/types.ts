import type { MAGIC_TRADITIONS } from "./values.ts";

type MagicTradition = SetElement<typeof MAGIC_TRADITIONS>;
type SpellTrait = keyof typeof CONFIG.PF2E.spellTraits;

type EffectAreaSize = keyof typeof CONFIG.PF2E.areaSizes;
type EffectAreaType = keyof typeof CONFIG.PF2E.areaTypes;

export type { EffectAreaSize, EffectAreaType, MagicTradition, SpellTrait };
