import type { RollNoteRuleElement, RollNoteSource } from "@module/rules/rule-element/roll-note.ts";
import { DEGREE_OF_SUCCESS_STRINGS } from "@system/degree-of-success.ts";
import { htmlQuery, tagify } from "@util";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";

/** Form handler for the RollNote rule element */
class RollNoteForm extends RuleElementForm<RollNoteSource, RollNoteRuleElement> {
    private html: HTMLElement | null = null;

    override template = "systems/pf2e/templates/items/rules/note.hbs";

    override async getData(): Promise<RollNoteFormSheetData> {
        return {
            ...(await super.getData()),
            selectorIsArray: Array.isArray(this.rule.selector),
        };
    }

    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);
        this.html = html;

        // Add events for toggle buttons
        htmlQuery(html, "[data-action=toggle-selector]")?.addEventListener("click", () => {
            const selector = this.rule.selector;
            const newValue = Array.isArray(selector) ? selector.at(0) ?? "" : [selector ?? ""].filter((s) => !!s);
            this.updateItem({ selector: newValue });
        });
        const optionsEl = htmlQuery<HTMLInputElement>(html, ".outcomes");
        tagify(optionsEl, { whitelist: [...DEGREE_OF_SUCCESS_STRINGS], maxTags: 3 });
    }

    override updateObject(ruleData: Partial<Record<string, unknown>>): void {
        super.updateObject(ruleData);

        const { html } = this;
        if (html) {
            const shouldBeHidden = htmlQuery<HTMLInputElement>(html, ".hidden-value")?.checked;
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
        }
    }
}

interface RollNoteFormSheetData extends RuleElementFormSheetData<RollNoteSource, RollNoteRuleElement> {
    selectorIsArray: boolean;
}

export { RollNoteForm };
