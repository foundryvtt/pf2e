import { GrantItemSource } from "@module/rules/rule-element/grant-item/base";
import { DEGREE_OF_SUCCESS_STRINGS } from "@system/degree-of-success";
import { tagify } from "@util";
import { RuleElementForm } from "./base";
import { FlatModifierForm } from "./flat-modifier";

/** Form handler for the RollNote rule element */
class RollNoteForm extends RuleElementForm {
    private html: HTMLElement | null = null;
    override template = "systems/pf2e/templates/items/rules/note.html";
    override activateListeners(html: HTMLElement) {
        this.html = html;
        const optionsEl = html.querySelector<HTMLInputElement>(".outcomes");
        if (optionsEl) {
            tagify(optionsEl, { whitelist: [...DEGREE_OF_SUCCESS_STRINGS], maxTags: 3 });
        }
    }

    override _updateObject(ruleData: Partial<Record<string, unknown>>): void {
        const { html } = this;
        if (html) {
            const shouldBeHidden = html.querySelector<HTMLInputElement>(".hidden-value")?.checked;
            const isHidden = ["gm", "owner"].includes(String(ruleData.visibility));
            if (shouldBeHidden !== isHidden) {
                if (shouldBeHidden) {
                    ruleData.visibility = "owner";
                } else {
                    delete ruleData.visibility;
                }
            }
        }

        if (Array.isArray(ruleData.outcome) && ruleData.outcome.length === 0) {
            delete ruleData.outcome;
        }

        if (typeof ruleData.title === "string") {
            ruleData.title = ruleData.title.trim();
            if (ruleData.title === "") {
                delete ruleData.title;
            }
        }
    }
}

/** Form handler for the GrantItem rule element */
class GrantItemForm extends RuleElementForm<GrantItemSource> {
    override template = "systems/pf2e/templates/items/rules/grant-item.html";
    override async getData() {
        const data = await super.getData();
        const uuid = this.rule.uuid ? String(this.rule.uuid) : null;
        const granted = uuid ? await fromUuid(uuid) : null;
        return { ...data, granted, allowDuplicate: this.rule.allowDuplicate ?? true };
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

const RULE_ELEMENT_FORMS: Partial<Record<string, ConstructorOf<RuleElementForm>>> = {
    Note: RollNoteForm,
    GrantItem: GrantItemForm,
    FlatModifier: FlatModifierForm,
};

export { RuleElementForm, RULE_ELEMENT_FORMS };
