import type { GrantItemRuleElement, GrantItemSource } from "@module/rules/rule-element/grant-item/rule-element.ts";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";

/** Form handler for the GrantItem rule element */
class GrantItemForm extends RuleElementForm<GrantItemSource, GrantItemRuleElement> {
    override template = "systems/pf2e/templates/items/rules/grant-item.hbs";
    override async getData(): Promise<GrantItemFormSheetData> {
        const data = await super.getData();
        const uuid = this.rule.uuid ? String(this.rule.uuid) : null;
        const granted = uuid ? await fromUuid(uuid) : null;
        return { ...data, granted };
    }

    override updateObject(ruleData: DeepPartial<GrantItemSource>): void {
        super.updateObject(ruleData);
        if (typeof ruleData.uuid === "string") {
            ruleData.uuid = ruleData.uuid.trim();
        }
    }
}

interface GrantItemFormSheetData extends RuleElementFormSheetData<GrantItemSource, GrantItemRuleElement> {
    granted: ClientDocument | null;
}

export { GrantItemForm };
