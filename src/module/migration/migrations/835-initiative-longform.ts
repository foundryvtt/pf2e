import { CreatureInitiativeSource, SkillAbbreviation } from "@actor/creature/index.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { SKILL_DICTIONARY } from "@actor/values.ts";
import { objectHasKey } from "@util";
import { MigrationBase } from "../base.ts";

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

interface InitiativeSourceOld extends Partial<CreatureInitiativeSource> {
    statistic?: CreatureInitiativeSource["statistic"];
    ability?: SkillAbbreviation | "perception";
    "-=ability"?: null;
}
