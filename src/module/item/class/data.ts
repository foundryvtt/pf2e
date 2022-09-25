import { AbilityString, SaveType } from "@actor/types";
import { ABCSystemSource } from "@item/abc/data";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemTraits } from "@item/data/base";
import { ZeroToFour } from "@module/data";
import type { ClassPF2e } from ".";
import { CLASS_TRAITS } from "./values";

type ClassSource = BaseItemSourcePF2e<"class", ClassSystemSource>;

type ClassData = Omit<ClassSource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<ClassPF2e, "class", ClassSystemData, ClassSource>;

interface ClassSystemSource extends ABCSystemSource {
    traits: ItemTraits;
    keyAbility: { value: AbilityString[]; selected: AbilityString | null };
    hp: number;
    perception: ZeroToFour;
    savingThrows: Record<SaveType, ZeroToFour>;
    attacks: ClassAttackProficiencies;
    defenses: ClassDefenseProficiencies;
    trainedSkills: {
        value: string[];
        additional: number;
    };
    classDC: ZeroToFour;
    ancestryFeatLevels: { value: number[] };
    classFeatLevels: { value: number[] };
    generalFeatLevels: { value: number[] };
    skillFeatLevels: { value: number[] };
    skillIncreaseLevels: { value: number[] };
}

type ClassSystemData = ClassSystemSource;

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

type ClassTrait = SetElement<typeof CLASS_TRAITS>;

export { ClassAttackProficiencies, ClassData, ClassDefenseProficiencies, ClassSource, ClassSystemData, ClassTrait };
