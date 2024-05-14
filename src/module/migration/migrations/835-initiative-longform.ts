import { CreatureInitiativeSource } from "@actor/creature/index.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { objectHasKey } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Converts sheet selected skills from shortform (ath) to longform (athletics) */
export class Migration835InitiativeLongform extends MigrationBase {
    static override version = 0.835;

    override async updateActor(actor: ActorSourcePF2e): Promise<void> {
        const attributes: OldAttributesSource = actor.system.attributes ?? {};
        const initiative: OldInitiativeSource | undefined = attributes.initiative;
        if (!initiative?.ability) return;

        const ability = initiative.ability;
        if (objectHasKey(SKILL_DICTIONARY, ability)) {
            initiative.statistic = SKILL_DICTIONARY[ability];
        } else {
            initiative.statistic = "perception";
        }

        initiative["-=ability"] = null;
    }
}

interface OldAttributesSource {
    hp?: object;
    initiative?: OldInitiativeSource;
}

interface OldInitiativeSource extends Partial<CreatureInitiativeSource> {
    statistic?: CreatureInitiativeSource["statistic"];
    ability?: SkillAbbreviation | "perception";
    "-=ability"?: null;
}

const SKILL_DICTIONARY = {
    acr: "acrobatics",
    arc: "arcana",
    ath: "athletics",
    cra: "crafting",
    dec: "deception",
    dip: "diplomacy",
    itm: "intimidation",
    med: "medicine",
    nat: "nature",
    occ: "occultism",
    prf: "performance",
    rel: "religion",
    soc: "society",
    ste: "stealth",
    sur: "survival",
    thi: "thievery",
} as const;

const SKILL_ABBREVIATIONS = R.keys.strict(SKILL_DICTIONARY);
type SkillAbbreviation = (typeof SKILL_ABBREVIATIONS)[number];
