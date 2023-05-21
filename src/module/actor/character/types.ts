import { HitPointsSummary } from "@actor/base.ts";
import { AbilityString, SkillLongForm } from "@actor/types.ts";
import { ZeroToFour } from "@module/data.ts";
import { Statistic } from "@system/statistic/index.ts";

interface CharacterHitPointsSummary extends HitPointsSummary {
    recoveryMultiplier: number;
    recoveryAddend: number;
}

type CharacterSkill = Statistic & { rank: ZeroToFour; ability: AbilityString };

type CharacterSkills = Record<SkillLongForm, CharacterSkill> & Partial<Record<string, CharacterSkill>>;

/** Single source of a Dexterity modifier cap to Armor Class, including the cap value itself. */
interface DexterityModifierCapData {
    /** The numeric value that constitutes the maximum Dexterity modifier. */
    value: number;
    /** The source of this Dex cap - usually the name of an armor, a monk stance, or a spell. */
    source: string;
}

export { CharacterHitPointsSummary, CharacterSkill, CharacterSkills, DexterityModifierCapData };
