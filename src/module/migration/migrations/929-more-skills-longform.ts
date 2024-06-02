import { MigrationBase } from "../base.ts";
import { objectHasKey, recursiveReplaceString, tupleHasValue } from "@util";
import { SKILL_ABBREVIATIONS, SKILL_DICTIONARY, SkillAbbreviation } from "./927-class-background-skill-longform.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import { ChoiceSetSource, UninflatedChoiceSet } from "@module/rules/rule-element/choice-set/data.ts";
import { RollOptionSource } from "@module/rules/rule-element/roll-option/rule-element.ts";
import { SkillSlug } from "@actor/types.ts";
import { SKILL_SLUGS } from "@actor/values.ts";
import { BattleFormSource } from "@module/rules/rule-element/battle-form/types.ts";
import { SIZES } from "@module/data.ts";

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

export class Migration929RemoveSkillAbbreviations extends MigrationBase {
    static override version = 0.929;

    #SKILL_LOCALIZATION = ((): RegExp => {
        const skillSlugs = [...SKILL_SLUGS, ...SKILL_ABBREVIATIONS].map(capitalize).join("|");
        return new RegExp(String.raw`PF2E.Skill(${skillSlugs})\b`, "g");
    })();

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = recursiveReplaceString(source.system.rules, (s) => {
            return s.replace(
                this.#SKILL_LOCALIZATION,
                (_match, group) => `PF2E.Skill.${capitalize(resolveLongForm(group.toLowerCase()))}`,
            );
        });

        // Replace AELike values with shortform
        for (const rule of source.system.rules) {
            if (rule.key === "ActiveEffectLike") {
                this.#transformAELike(rule);
            } else if (rule.key === "BattleForm") {
                this.#transformBattleFormPart2(rule);
            } else if (rule.key === "ChoiceSet") {
                this.#transformChoiceSet(rule);
            } else if (rule.key === "RollOption") {
                this.#transformRollOption(rule);
            }
        }
    }

    #transformAELike(rule: AELikeSource) {
        // Nothing uses this in our compendium but it could theoretically occur in 3pp
        if (rule.value) {
            rule.value = recursiveReplaceString(rule.value, (s) => resolveLongForm(s));
        }
    }

    #transformBattleFormPart2(rule: BattleFormSource) {
        if (!("value" in rule && rule.value && typeof rule.value === "object")) {
            return;
        }

        type BattleFormOverride = BattleFormSource["overrides"];
        if ("brackets" in rule.value && Array.isArray(rule.value.brackets)) {
            for (const bracket of rule.value.brackets) {
                const overrides = "value" in bracket ? (bracket.value as BattleFormOverride) : null;
                if (!overrides?.skills) continue;

                const skills: Partial<Record<SkillSlug | SkillAbbreviation, unknown>> = overrides.skills;
                for (const [key, value] of Object.entries(skills)) {
                    if (objectHasKey(SKILL_DICTIONARY, key)) {
                        skills[SKILL_DICTIONARY[key]] = value;
                        delete skills[key];
                    }
                }
            }
        }
    }

    #transformChoiceSet(rule: ChoiceSetSource) {
        if (objectHasKey(SKILL_DICTIONARY, rule.selection)) {
            rule.selection = SKILL_DICTIONARY[rule.selection];
        }

        const choices = rule.choices ? (rule.choices as UninflatedChoiceSet) : null;
        if (Array.isArray(choices)) {
            for (const choice of choices) {
                if (typeof choice !== "object") continue;

                if ("value" in choice && choice.value) {
                    // Make sure we're not treating "med" as in "medium" as medicine.
                    if (choice.value === "med") {
                        const isLabelMedium = "label" in choice && choice.label === "PF2E.ActorSizeMedium";
                        const hasSizeProp = choices.some((c) => c.value !== "med" && tupleHasValue(SIZES, c.value));
                        if (isLabelMedium || hasSizeProp) continue;
                    }

                    choice.value = recursiveReplaceString(choice.value, (s) => resolveLongForm(s));
                }
            }
        }
    }

    #transformRollOption(rule: RollOptionSource) {
        if (rule.value) {
            rule.value = resolveLongForm(rule.value);
        }
        if (Array.isArray(rule.suboptions)) {
            for (const sub of rule.suboptions) {
                if (sub && typeof sub === "object" && "value" in sub) {
                    sub.value = resolveLongForm(sub.value);
                }
            }
        }
    }
}

function resolveLongForm<T>(value: T): T | SkillSlug {
    return objectHasKey(SKILL_DICTIONARY, value) ? SKILL_DICTIONARY[value] : value;
}
