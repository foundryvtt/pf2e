import { HitPointsSummary } from "@actor/base";
import { SkillAbbreviation } from "@actor/creature/data";
import { AbilityString, SkillLongForm } from "@actor/types";
import { WeaponPF2e } from "@item";
import { ZeroToFour } from "@module/data";
import { Statistic } from "@system/statistic";

interface CharacterHitPointsSummary extends HitPointsSummary {
    recoveryMultiplier: number;
    recoveryAddend: number;
}

type CharacterSkill = Statistic & { rank: ZeroToFour; ability: AbilityString };

type CharacterSkills = Record<SkillAbbreviation, CharacterSkill> &
    Record<SkillLongForm, CharacterSkill> &
    Partial<Record<string, CharacterSkill>>;

interface CreateAuxiliaryInteractParams {
    weapon: Embedded<WeaponPF2e>;
    action: "Interact";
    purpose: "Grip" | "Sheathe" | "Draw" | "Retrieve" | "PickUp";
    hands?: 0 | 1 | 2;
}

interface CreateAuxiliaryReleaseParams {
    weapon: Embedded<WeaponPF2e>;
    action: "Release";
    purpose: "Grip" | "Drop";
    hands: 0 | 1;
}

type CreateAuxiliaryParams = CreateAuxiliaryInteractParams | CreateAuxiliaryReleaseParams;

/** Single source of a Dexterity modifier cap to Armor Class, including the cap value itself. */
interface DexterityModifierCapData {
    /** The numeric value that constitutes the maximum Dexterity modifier. */
    value: number;
    /** The source of this Dex cap - usually the name of an armor, a monk stance, or a spell. */
    source: string;
}

export { CharacterHitPointsSummary, CharacterSkill, CharacterSkills, CreateAuxiliaryParams, DexterityModifierCapData };
