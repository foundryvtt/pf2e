import { AbilityString } from "@actor/data/base";
import { ABCSystemData } from "@item/abc/data";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { ZeroToFour } from "@module/data";
import type { ClassPF2e } from ".";

export type ClassSource = BaseNonPhysicalItemSource<"class", ClassSystemData>;

export class ClassData extends BaseNonPhysicalItemData<ClassPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/class.svg";
}

export interface ClassData extends Omit<ClassSource, "_id" | "effects"> {
    type: ClassSource["type"];
    data: ClassSource["data"];
    readonly _source: ClassSource;
}

interface ClassSystemData extends ABCSystemData {
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
    abilityBoostLevels: { value: number[] };
}

// Classes don't have traits, both feats, spells, and other items can have traits corresponding with a class
export const CLASS_TRAITS = [
    "alchemist",
    "barbarian",
    "bard",
    "champion",
    "cleric",
    "druid",
    "fighter",
    "investigator",
    "monk",
    "oracle",
    "ranger",
    "rogue",
    "sorcerer",
    "swashbuckler",
    "witch",
    "wizard",
] as const;
export type ClassTrait = typeof CLASS_TRAITS[number];
