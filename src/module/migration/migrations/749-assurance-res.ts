import { SkillLongForm } from "@actor/data/types";
import { SKILL_LONG_FORMS } from "@actor/data/values";
import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { ChoiceSetSource } from "@module/rules/rule-element/choice-set/data";
import { setHasElement } from "@util";
import { MigrationBase } from "../base";

export class Migration749AssuranceREs extends MigrationBase {
    static override version = 0.749;

    #isChoiceSetWithSelection(rule: RuleElementSource): rule is ChoiceSetSource {
        return rule.key === "ChoiceSet";
    }

    #newRules(skill: SkillLongForm | "choice"): RuleElementSource[] {
        const selector = skill === "choice" ? "{item|flags.pf2e.rulesSelections.assurance}" : skill;
        const rules = [
            {
                key: "SubstituteRoll",
                label: "PF2E.SpecificRule.SubstituteRoll.Assurance",
                selector,
                slug: "assurance",
                value: 10,
            },
            {
                key: "AdjustModifier",
                predicate: {
                    all: ["substitute:assurance"],
                    not: ["bonus:type:proficiency"],
                },
                selector,
                suppress: true,
            },
        ];

        return rules;
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const { slug, rules } = source.data;
        if (!(source.type === "feat" && slug?.startsWith("assurance"))) {
            return;
        }

        const firstRule: (RuleElementSource & { flag?: string }) | undefined = rules.at(0);
        if (slug === "assurance" && firstRule && rules.length === 1 && this.#isChoiceSetWithSelection(firstRule)) {
            firstRule.flag = "assurance";
            rules.push(...this.#newRules("choice"));
        } else if (rules.length === 0) {
            const skill = /^assurance-([a-z]+)$/.exec(slug)?.at(1);
            if (setHasElement(SKILL_LONG_FORMS, skill)) {
                rules.push(...this.#newRules(skill));
            }
        }
    }
}
