import { MigrationBase } from "../base.ts";
import { SkillSlug } from "@actor/types.ts";
import { objectHasKey, recursiveReplaceString } from "@util";
import { CharacterSystemSource } from "@actor/character/data.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ZeroToFour } from "@module/data.ts";
import { SKILL_ABBREVIATIONS, SKILL_DICTIONARY, SkillAbbreviation } from "./927-class-background-skill-longform.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";

export class Migration928CharacterSkillsLongform extends MigrationBase {
    static override version = 0.928;

    #SKILL_SHORT_FORM_PATH = ((): RegExp => {
        const skillShortForms = SKILL_ABBREVIATIONS.join("|");
        return new RegExp(String.raw`system\.skills\.(${skillShortForms})\b`, "g");
    })();

    #SKILL_SHORT_FORM_OPTION = ((): RegExp => {
        const skillShortForms = SKILL_ABBREVIATIONS.join("|");
        return new RegExp(String.raw`skill:(${skillShortForms})\b`, "g");
    })();

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        this.#replacePathsAndOptions(source);
        if (source.type !== "character") return;

        const system: CharacterSystemSourceMaybeOld = source.system;
        for (const [key, value] of Object.entries(system.skills)) {
            if (objectHasKey(SKILL_DICTIONARY, key) && value !== null) {
                system.skills[SKILL_DICTIONARY[key]] = value;
                system.skills[`-=${key}`] = null;
            }
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        this.#replacePathsAndOptions(source);
    }

    /** Replace all paths everywhere with longform. This catches AELikes and inline rolls */
    #replacePathsAndOptions(source: ActorSourcePF2e | ItemSourcePF2e) {
        source.system = recursiveReplaceString(source.system, (s) => {
            return s.replace(this.#SKILL_SHORT_FORM_PATH, (match, group) =>
                objectHasKey(SKILL_DICTIONARY, group) ? `system.skills.${SKILL_DICTIONARY[group]}` : match,
            );
        });

        source.system = recursiveReplaceString(source.system, (s) => {
            return s.replace(this.#SKILL_SHORT_FORM_OPTION, (match, group) =>
                objectHasKey(SKILL_DICTIONARY, group) ? `skill:${SKILL_DICTIONARY[group]}` : match,
            );
        });
    }
}

interface CharacterSystemSourceMaybeOld extends CharacterSystemSource {
    skills: Partial<Record<SkillSlug | SkillAbbreviation, { rank: ZeroToFour }>> &
        Partial<Record<`-=${SkillAbbreviation}`, null>>;
}
