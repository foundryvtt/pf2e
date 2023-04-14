import { GrantItemRuleElement, GrantItemSource } from "@module/rules/rule-element/grant-item/rule-element.ts";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";

/** Form handler for the GrantItem rule element */
class GrantItemForm extends RuleElementForm<GrantItemSource, GrantItemRuleElement> {
    override template = "systems/pf2e/templates/items/rules/grant-item.hbs";
    override async getData(): Promise<GrantItemFormSheetData> {
        const data = await super.getData();
        const uuid = this.rule.uuid ? String(this.rule.uuid) : null;
        const granted = uuid ? await fromUuid(uuid) : null;
        return { ...data, granted, allowDuplicate: !!this.rule.allowDuplicate ?? true };
    }

    override _updateObject(ruleData: DeepPartial<GrantItemSource>): void {
        if (typeof ruleData.uuid === "string") {
            ruleData.uuid = ruleData.uuid.trim();
            if (ruleData.uuid === "") delete ruleData.uuid;
        }

        // Optional but defaults to false
        if (!ruleData.replaceSelf) delete ruleData.replaceSelf;
        if (!ruleData.reevaluateOnUpdate) delete ruleData.reevaluateOnUpdate;

        // Optional but defaults to true
        if (ruleData.allowDuplicate) delete ruleData.allowDuplicate;
    }
}

interface GrantItemFormSheetData extends RuleElementFormSheetData<GrantItemSource, GrantItemRuleElement> {
    granted: ClientDocument | null;
    allowDuplicate: boolean;
}

export { GrantItemForm };
