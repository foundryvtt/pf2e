import type {
    DamageAlterationRuleElement,
    DamageAlterationSource,
} from "@module/rules/rule-element/damage-alteration/rule-element.ts";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";

/** Form handler for the DamageAlteration rule element */
export class DamageAlterationForm extends RuleElementForm<DamageAlterationSource, DamageAlterationRuleElement> {
    override async getData(): Promise<RuleElementFormSheetData<DamageAlterationSource, DamageAlterationRuleElement>> {
        const data = await super.getData();
        if (typeof data.rule.selectors === "string") data.rule.selectors = [data.rule.selectors];
        data.hiddenFields.push("label", "slug");
        return data;
    }
}
