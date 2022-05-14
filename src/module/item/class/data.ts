import { AbilityString } from "@actor/data/base";
import { ABCSystemData } from "@item/abc/data";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemTraits } from "@item/data/base";
import { ZeroToFour } from "@module/data";
import type { ClassPF2e } from ".";
import { CLASS_TRAITS } from "./values";

type ClassSource = BaseItemSourcePF2e<"class", ClassSystemSource>;

type ClassData = Omit<ClassSource, "effects" | "flags"> &
    BaseItemDataPF2e<ClassPF2e, "class", ClassSystemData, ClassSource>;

interface ClassSystemSource extends ABCSystemData {
    traits: ItemTraits;
    keyAbility: { value: AbilityString[] };
    hp: number;
    perception: ZeroToFour;
    savingThrows: {
        fortitude: ZeroToFour;
        reflex: ZeroToFour;
        will: ZeroToFour;
    };
    attacks: {
        simple: ZeroToFour;
        martial: ZeroToFour;
        advanced: ZeroToFour;
        unarmed: ZeroToFour;
        other: { name: string; rank: ZeroToFour };
    };
    defenses: {
        unarmored: ZeroToFour;
        light: ZeroToFour;
        medium: ZeroToFour;
        heavy: ZeroToFour;
    };
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

type ClassTrait = SetElement<typeof CLASS_TRAITS>;

export { ClassData, ClassSource, ClassSystemData, ClassTrait };
