import { CreatureInitiativeSource, CreatureInitiativeData, SkillAbbreviation } from "@actor/creature";
import { ActorSourcePF2e } from "@actor/data";
import { SKILL_DICTIONARY } from "@actor/values";
import { objectHasKey } from "@util";
import { MigrationBase } from "../base";

/** Converts sheet selected skills from shortform (ath) to longform (athletics) */
export class Migration835InitiativeLongform extends MigrationBase {
    static override version = 0.835;

    override async updateActor(actor: ActorSourcePF2e): Promise<void> {
        if (!("initiative" in actor.system.attributes)) return;

        const initiative: InitiativeSourceOld | undefined = actor.system.attributes.initiative;
        if (!initiative || !initiative.ability) return;

        const ability = initiative.ability;
        if (objectHasKey(SKILL_DICTIONARY, ability)) {
            initiative.statistic = SKILL_DICTIONARY[ability];
        } else {
            initiative.statistic = "perception";
        }

        delete initiative.ability;
        initiative["-=ability"] = null;
    }
}

interface InitiativeSourceOld extends Partial<CreatureInitiativeData> {
    statistic?: CreatureInitiativeSource["statistic"];
    ability?: SkillAbbreviation | "perception";
    "-=ability"?: null;
}
