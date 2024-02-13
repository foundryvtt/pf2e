import { AttributeString, SaveType, SkillAbbreviation } from "@actor/types.ts";
import { ABCSystemData, ABCSystemSource } from "@item/abc/data.ts";
import { ProficiencyValues } from "@item/base/data/index.ts";
import { BaseItemSourcePF2e, RarityTraitAndOtherTags } from "@item/base/data/system.ts";

type ClassSource = BaseItemSourcePF2e<"class", ClassSystemSource>;

interface ClassSystemSource extends ABCSystemSource {
    traits: RarityTraitAndOtherTags;
    keyAbility: { value: AttributeString[]; selected: AttributeString | null };
    hp: number;
    perception: ProficiencyValues;
    savingThrows: Record<SaveType, ProficiencyValues>;
    attacks: ClassAttackProficiencies;
    defenses: ClassDefenseProficiencies;
    /** Starting proficiency in "spell attack rolls and DCs" */
    spellcasting: ProficiencyValues;
    trainedSkills: {
        value: SkillAbbreviation[];
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
    simple: ProficiencyValues;
    martial: ProficiencyValues;
    advanced: ProficiencyValues;
    unarmed: ProficiencyValues;
    other: { name: string; rank: ProficiencyValues };
}

interface ClassDefenseProficiencies {
    unarmored: ProficiencyValues;
    light: ProficiencyValues;
    medium: ProficiencyValues;
    heavy: ProficiencyValues;
}

export type { ClassAttackProficiencies, ClassDefenseProficiencies, ClassSource, ClassSystemData, ClassSystemSource };
