import { MAGIC_SCHOOLS, MAGIC_TRADITIONS } from "./values";

type MagicSchool = SetElement<typeof MAGIC_SCHOOLS>;
type MagicTradition = SetElement<typeof MAGIC_TRADITIONS>;
type SpellTrait = keyof ConfigPF2e["PF2E"]["spellTraits"] | MagicSchool | MagicTradition;

export { MagicSchool, MagicTradition, SpellTrait };
