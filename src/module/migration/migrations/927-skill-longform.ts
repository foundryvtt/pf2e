import { ActorSourcePF2e } from "@actor/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

export class Migration927SkillLongforms extends MigrationBase {
    static override version = 0.927;

    #convertDictionaryToLongform<V>(values: Record<string, V>): void {
        for (const [shortForm, longForm] of R.entries.strict(SKILL_DICTIONARY)) {
            const existingValue = shortForm in values ? values[shortForm] : null;
            console.log(existingValue, longForm);
            // todo: keep implementing
        }
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "character") {
            this.#convertDictionaryToLongform(source.system.skills);
        }
    }
}

// todo: migrate skill macros
// todo: migrate check types
// todo: migrate battleform skill overrides
// todo: migrate character skill mapping
// todo: migrate skill:ath:X roll options
// todo: migrate choiceset results and options that are short forms
// todo: migrate paths that are short forms
// todo: migrate class trainedSkills.value
// todo: migrate background trainedSkills.value to background trainedSkills

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

// const SKILL_ABBREVIATIONS = R.keys.strict(SKILL_DICTIONARY);
// type SkillAbbreviation = (typeof SKILL_ABBREVIATIONS)[number];

// const SKILL_DICTIONARY_REVERSE = Object.fromEntries(
//     Object.entries(SKILL_DICTIONARY).map(([abbrev, value]) => [value, abbrev] as [SkillLongForm, SkillAbbreviation]),
// );
