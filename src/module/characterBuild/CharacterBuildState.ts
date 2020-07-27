import { Ancestries } from "./Ancestries"
import { Backgrounds } from "./Backgrounds"
import { Classes } from "./Classes"
import { Skills } from "./Skills"
import { Proficiencies } from "./Proficiencies"


export type CharacterBuildState = {
    Ancestry: keyof Ancestries;
    Background: keyof Backgrounds;
    Class: keyof Classes;
    SubClass?: string;
    BuildChoices: BuildChoices; // all the various levels and their respective choices
}

type BuildChoices = {
    Level1: BuildChoice[]
    Level2: BuildChoice[]
    Level3: BuildChoice[]
    Level4: BuildChoice[]
    Level5: BuildChoice[]
    Level6: BuildChoice[]
    Level7: BuildChoice[]
    Level8: BuildChoice[]
    Level9: BuildChoice[]
    Level10: BuildChoice[]
    Level11: BuildChoice[]
    Level12: BuildChoice[]
    Level13: BuildChoice[]
    Level14: BuildChoice[]
    Level15: BuildChoice[]
    Level16: BuildChoice[]
    Level17: BuildChoice[]
    Level18: BuildChoice[]
    Level19: BuildChoice[]
    Level20: BuildChoice[]
}

type BuildChoice = {
    choiceName: string;
    extraChoice?: BuildChoice; // for things that grant another option (i.e. Dedication, etc)
    prerequisites?: ChoicePrerequisite;
    applyChoice: () => void;
}

type ChoicePrerequisite = {
    abilityScore?: keyof AbilityScoreArray;
    choice?: BuildChoice;
    skillProficiency?: SkillProficiencyPreReq;
    meetsPreReqs: () => boolean;
}

type SkillProficiencyPreReq = {
    skill: keyof Skills;
    proficiency: Proficiencies;
}

