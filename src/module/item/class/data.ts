import { AbilityString } from "@actor/data/base";
import { ABCSystemData } from "@item/abc/data";
import { ItemTraits } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { ZeroToFour } from "@module/data";
import type { ClassPF2e } from ".";
import { CLASS_TRAITS } from "./values";

type ClassSource = BaseNonPhysicalItemSource<"class", ClassSystemData>;

class ClassData extends BaseNonPhysicalItemData<ClassPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/class.svg";
}

interface ClassData extends Omit<ClassSource, "effects" | "flags"> {
    type: ClassSource["type"];
    data: ClassSource["data"];
    readonly _source: ClassSource;
}

interface ClassSystemData extends ABCSystemData {
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

type ClassTrait = SetElement<typeof CLASS_TRAITS>;

export { ClassData, ClassSource, ClassSystemData, ClassTrait };
