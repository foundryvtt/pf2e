import { AbilityString } from "../../../../src/module/actor/actorDataDefinitions"

/**
 * A class to track the state of a given build.
 * This holds validation state for RAW and PFS, as well as the choices made for a given build.
 */
export class BuildState {

}


/**
 * A list of the decisions needed for player character creation.
 */
export type BuildChoices = {
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

export type BuildItemProperties = {

}

/**
 * An abstract of any decision a player could need to make about a PC build.
 * @property {string} name The name of the Build Choice
 * @property {BuildChoiceTypes} type The type of the Build Choice. 
 * @property {Item} item The Item that is added to the Actor when the BuildChoice is selected
 * @property {BuildChoice} extraChoice When a choice unlocks additional choices. i.e. Natural Ambition 
 * @property {BuildChoicePrerequisite} prerequisites Used to validate builds. Lists preReqs needed to take a Build Choice
 * @property {function} applyChoice The method called on the Choice that will as it to the Build State
 * @property {function} removeChoice The method called on the Choice that will remove it from the Build State
 */
export type BuildChoice = {
    name: string;
    type: BuildChoiceTypes;
    item?: Item;
    extraChoice?: BuildChoice;
    prerequisites?: BuildChoicePrerequisite;
    applyChoice: (CurrentState: BuildState) => BuildState;
    removeChoice: (CurrentState: BuildState) => BuildState;
}

export type BuildChoiceTypes = "ancestry" | "background" | "class" | "heritage" | "abilityBoosts" | "skillTraining" | "ancestryFeat" | "classFeat" | "skillFeat" | "generalFeat" | "subclass" | "misc"

export type BuildChoicePrerequisite = {
    abilityScore?: { ability: AbilityString, score: number};
    choice?: BuildChoice;
    skillProficiency?: SkillProficiencyPreReq;
    trait: TraitPrerequisite;
    meetsPreReqs: () => boolean;
}

export type SkillProficiencyPreReq = {
    skill: string; //TODO: find declaration for skills and use that type
    proficiency: string; //TODO: find declaration for proficiencies and use that type
}

export type TraitPrerequisite = {
    traits: string; //TODO: find declaration for traits and use that type
}