import { AttributeString, SaveType, SkillSlug } from "@actor/types.ts";
import { ABCSystemData, ABCSystemSource } from "@item/abc/data.ts";
import { BaseItemSourcePF2e, RarityTraitAndOtherTags } from "@item/base/data/system.ts";
import { ProficiencyRankNumber } from "@module/data.ts";

type ClassSource = BaseItemSourcePF2e<"class", ClassSystemSource>;

interface ClassSystemSource extends ABCSystemSource {
    traits: RarityTraitAndOtherTags;
    keyAbility: { value: AttributeString[]; selected: AttributeString | null };
    hp: number;
    perception: ProficiencyRankNumber;
    savingThrows: Record<SaveType, ProficiencyRankNumber>;
    attacks: ClassAttackProficiencies;
    defenses: ClassDefenseProficiencies;
    /** Starting proficiency in "spell attack rolls and DCs" */
    spellcasting: ProficiencyRankNumber;
    trainedSkills: {
        value: SkillSlug[];
        additional: number;
    };
    ancestryFeatLevels: { value: number[] };
    classFeatLevels: { value: number[] };
    generalFeatLevels: { value: number[] };
    skillFeatLevels: { value: number[] };
    skillIncreaseLevels: { value: number[] };
    level?: never;
}

interface ClassSystemData extends Omit<ClassSystemSource, "description">, Omit<ABCSystemData, "level" | "traits"> {}

interface ClassAttackProficiencies {
    simple: ProficiencyRankNumber;
    martial: ProficiencyRankNumber;
    advanced: ProficiencyRankNumber;
    unarmed: ProficiencyRankNumber;
    other: { name: string; rank: ProficiencyRankNumber };
}

interface ClassDefenseProficiencies {
    unarmored: ProficiencyRankNumber;
    light: ProficiencyRankNumber;
    medium: ProficiencyRankNumber;
    heavy: ProficiencyRankNumber;
}

export type { ClassAttackProficiencies, ClassDefenseProficiencies, ClassSource, ClassSystemData, ClassSystemSource };
