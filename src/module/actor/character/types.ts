import type { HitPointsSummary } from "@actor/base.ts";
import type { SaveType, SkillSlug } from "@actor/types.ts";
import type { MagicTradition } from "@item/spell/types.ts";
import type { ZeroToFour } from "@module/data.ts";
import type { Statistic } from "@system/statistic/index.ts";
import type { CharacterPF2e } from "./document.ts";

interface CharacterHitPointsSummary extends HitPointsSummary {
    recoveryMultiplier: number;
    recoveryAddend: number;
}

type CharacterSkill<TActor extends CharacterPF2e> = Statistic<TActor> & { rank: ZeroToFour };

type CharacterSkills<TActor extends CharacterPF2e> = Record<string, CharacterSkill<TActor>>;

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
    | SkillSlug
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
