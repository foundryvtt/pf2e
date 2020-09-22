import { RawCharacterData } from "../../../../src/module/actor/actorDataDefinitions";
import { BuildChoices, BuildState } from "./playerCharacterBuild";

/**
 * The overarching player character builder class.
 * The class will be a singleton available as ??? //TODO
 */
declare class PlayerCharacterBuilder {
    /**
     * 
     * @param buildChoices A list of all the decisions needed to create a PF2e Player Character. This does not include items.
     * @override
     */
    build(buildChoices: BuildState): RawCharacterData

    /**
     * Validate a build for integrity regarding RAW. Using this method at the end of a build process should be at the discretion of the GM.
     * 
     * @param buildChoices      See create method
     * @param PFS               Determines whether PFS specifics will be considered.
     * @override
     */
    validate(buildChoices: BuildChoices, PFS: boolean): boolean

}
