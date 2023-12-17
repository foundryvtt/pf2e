import { RuleElementSource } from "@module/rules/index.ts";
import { MultipleAttackPenaltyRuleElement } from "@module/rules/rule-element/multiple-attack-penalty.ts";
import { RuleElementForm } from "./base.ts";

class MultipleAttackPenaltyForm extends RuleElementForm<RuleElementSource, MultipleAttackPenaltyRuleElement> {
    override template = "systems/pf2e/templates/items/rules/multiple-attack-penalty.hbs";
}

export { MultipleAttackPenaltyForm };
