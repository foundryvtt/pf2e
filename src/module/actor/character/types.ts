import { HitPointsSummary } from "@actor/base";
import { SkillAbbreviation } from "@actor/creature/data";
import { AbilityString } from "@actor/data";
import { SkillLongForm } from "@actor/data/types";
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

export { CharacterHitPointsSummary, CharacterSkill, CharacterSkills, CreateAuxiliaryParams };
