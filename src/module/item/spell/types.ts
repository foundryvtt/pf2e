import type { MAGIC_SCHOOLS, MAGIC_TRADITIONS, SPELL_COMPONENTS } from "./values.ts";

type MagicSchool = SetElement<typeof MAGIC_SCHOOLS>;
type MagicTradition = SetElement<typeof MAGIC_TRADITIONS>;
type SpellComponent = (typeof SPELL_COMPONENTS)[number];
type SpellTrait = keyof ConfigPF2e["PF2E"]["spellTraits"] | MagicSchool | MagicTradition;

type EffectAreaSize = keyof ConfigPF2e["PF2E"]["areaSizes"];
type EffectAreaType = keyof ConfigPF2e["PF2E"]["areaTypes"];

export type { EffectAreaSize, EffectAreaType, MagicSchool, MagicTradition, SpellComponent, SpellTrait };
