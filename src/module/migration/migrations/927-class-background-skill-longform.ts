import { BackgroundSource, ClassSource, ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";
import { ClassSystemSource } from "@item/class/data.ts";
import { SkillSlug } from "@actor/types.ts";
import { BackgroundSystemSource } from "@item/background/data.ts";
import { BattleFormSource } from "@module/rules/rule-element/battle-form/types.ts";
import { objectHasKey } from "@util";
import * as R from "remeda";

export class Migration927ClassBackgroundBattleFormSkillLongform extends MigrationBase {
    static override version = 0.927;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        // Migrate any battleform rules on any items
        for (const rule of source.system.rules) {
            if (rule.key === "BattleForm") {
                this.#updateBattleForm(rule as BattleFormSource);
            }
        }

        // Migrate class and background items
        if (source.type === "class") {
            this.#updateClass(source);
        } else if (source.type === "background") {
            this.#updateBackground(source);
        }
    }

    #updateBattleForm(rule: BattleFormSource) {
        if (!rule.overrides?.skills) return;

        const skills: Partial<Record<SkillSlug | SkillAbbreviation, unknown>> = rule.overrides.skills;
        for (const [key, value] of Object.entries(skills)) {
            if (objectHasKey(SKILL_DICTIONARY, key)) {
                skills[SKILL_DICTIONARY[key]] = value;
                delete skills[key];
            }
        }
    }

    #updateClass(source: ClassSource) {
        const system: ClassSystemSourceMaybeOld = source.system;
        const mapping: Record<string, SkillSlug | undefined> = SKILL_DICTIONARY;
        system.trainedSkills.value = system.trainedSkills.value.map((s) => mapping[s] ?? s);
    }

    #updateBackground(source: BackgroundSource) {
        const system: BackgroundSystemSourceMaybeOld = source.system;
        const mapping: Record<string, SkillSlug | undefined> = SKILL_DICTIONARY;
        system.trainedSkills.value = system.trainedSkills.value.map((s) => mapping[s] ?? s);
        if ("trainedLore" in system) {
            // Move lores and convert to array. Lore entry may not exist in source data
            const lores = system.trainedLore ? system.trainedLore.split(",").map((s) => s.trim()) : [];
            system.trainedSkills.lore = system.trainedSkills.lore?.length ? system.trainedSkills.lore : lores;
            system["-=trainedLore"] = null;
        }
    }
}

export const SKILL_DICTIONARY = {
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

export type SkillAbbreviation = keyof typeof SKILL_DICTIONARY;

export const SKILL_ABBREVIATIONS = R.keys.strict(SKILL_DICTIONARY);

interface ClassSystemSourceMaybeOld extends Omit<ClassSystemSource, "trainedSkills"> {
    trainedSkills: {
        value: (SkillAbbreviation | SkillSlug)[];
    };
}

interface BackgroundSystemSourceMaybeOld extends Omit<BackgroundSystemSource, "trainedSkills"> {
    trainedLore?: string;
    "-=trainedLore"?: null;
    trainedSkills: {
        value: (SkillAbbreviation | SkillSlug)[];
        lore: string[];
    };
}
