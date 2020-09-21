import PF2EActor from "../actor/actor";
import { AbilityString, RawCharacterData } from "../actor/actorDataDefinitions";

/**
 * The overarching player character builder class.
 * The class will be a singleton available as ??? //TODO
 */
declare class PlayerCharacterBuilder {
    /**
     * 
     * @param buildChoices A list of all the decisions needed to create a PF2e Player Character. This does not include items.
     */
    create(buildChoices: BuildChoices): RawCharacterData

    /**
     * Validate a build for integrity regarding RAW. Using this method at the end of a build process should be at the discretion of the GM.
     * 
     * @param buildChoices      See create method
     * @param PFS               Determines whether PFS specifics will be considered.
     */
    validate(buildChoices: BuildChoices, PFS: boolean): boolean

}

/**
 * A list of the decisions needed for player character creation.
 */
type BuildChoices = {
    Ancestry: string;
    Background: string;
    Class: string;
    SubClass?: string;
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

/**
 * An abstract of any decision a player could need to make about a PC build.
 */
type BuildChoice = {
    choiceName: string;
    choiceType: string; //TODO: Determine if needed (types could be Feat, Class Feature, Skill Feat, etc.)
    extraChoice?: BuildChoice;
    prerequisites?: ChoicePrerequisite;
    applyChoice: () => void;
}

type ChoicePrerequisite = {
    abilityScore?: { ability: AbilityString, score: number};
    choice?: BuildChoice;
    skillProficiency?: SkillProficiencyPreReq;
    trait: TraitPrerequisite;
    meetsPreReqs: () => boolean;
}

type SkillProficiencyPreReq = {
    skill: string; //TODO: find declaration for skills and use that type
    proficiency: string; //TODO: find declaration for proficiencies and use that type
}

type TraitPrerequisite = {
    traits: string; //TODO: find declaration for traits and use that type
}
