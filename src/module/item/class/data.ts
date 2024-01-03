import { AttributeString, SaveType } from "@actor/types.ts";
import { ABCSystemData, ABCSystemSource } from "@item/abc/data.ts";
import { BaseItemSourcePF2e, RarityTraitAndOtherTags } from "@item/base/data/system.ts";
import { ZeroToFour } from "@module/data.ts";

type ClassSource = BaseItemSourcePF2e<"class", ClassSystemSource>;

interface ClassSystemSource extends ABCSystemSource {
    traits: RarityTraitAndOtherTags;
    keyAbility: { value: AttributeString[]; selected: AttributeString | null };
    hp: number;
    perception: ZeroToFour;
    savingThrows: Record<SaveType, ZeroToFour>;
    attacks: ClassAttackProficiencies;
    defenses: ClassDefenseProficiencies;
    /** Starting proficiency in "spell attack rolls and DCs" */
    spellcasting: ZeroToFour;
    trainedSkills: {
        value: string[];
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
    simple: ZeroToFour;
    martial: ZeroToFour;
    advanced: ZeroToFour;
    unarmed: ZeroToFour;
    other: { name: string; rank: ZeroToFour };
}

interface ClassDefenseProficiencies {
    unarmored: ZeroToFour;
    light: ZeroToFour;
    medium: ZeroToFour;
    heavy: ZeroToFour;
}

export type { ClassAttackProficiencies, ClassDefenseProficiencies, ClassSource, ClassSystemData, ClassSystemSource };
