import { HitPointsSummary } from "@actor/base.ts";
import { AttributeString, SaveType, SkillLongForm } from "@actor/types.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { ZeroToFour } from "@module/data.ts";
import type { Statistic } from "@system/statistic/index.ts";

interface CharacterHitPointsSummary extends HitPointsSummary {
    recoveryMultiplier: number;
    recoveryAddend: number;
}

type CharacterSkill = Statistic & { rank: ZeroToFour; ability: AttributeString };

type CharacterSkills = Record<SkillLongForm, CharacterSkill> & Partial<Record<string, CharacterSkill>>;

/** Single source of a Dexterity modifier cap to Armor Class, including the cap value itself. */
interface DexterityModifierCapData {
    /** The numeric value that constitutes the maximum Dexterity modifier. */
    value: number;
    /** The source of this Dex cap - usually the name of an armor, a monk stance, or a spell. */
    source: string;
}

/** Slugs guaranteed to return a `Statistic` when passed to `CharacterPF2e#getStatistic` */
type GuaranteedGetStatisticSlug =
    | SaveType
    | SkillLongForm
    | "perception"
    | "class-spell"
    | "class"
    | "class-dc"
    | "classDC"
    | MagicTradition;

export type {
    CharacterHitPointsSummary,
    CharacterSkill,
    CharacterSkills,
    DexterityModifierCapData,
    GuaranteedGetStatisticSlug,
};
