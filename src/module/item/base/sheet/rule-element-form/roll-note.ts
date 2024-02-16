import type { NoteRESource, RollNoteRuleElement } from "@module/rules/rule-element/roll-note.ts";
import { DEGREE_OF_SUCCESS_STRINGS } from "@system/degree-of-success.ts";
import { htmlQuery, tagify } from "@util";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";

/** Form handler for the RollNote rule element */
class RollNoteForm extends RuleElementForm<NoteRESource, RollNoteRuleElement> {
    override template = "systems/pf2e/templates/items/rules/note.hbs";

    override async getData(): Promise<RollNoteFormSheetData> {
        return {
            ...(await super.getData()),
            selectorIsArray: Array.isArray(this.rule.selector),
        };
    }

    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);

        // Add events for toggle buttons
        htmlQuery(html, "[data-action=toggle-selector]")?.addEventListener("click", () => {
            const selector = this.rule.selector;
            const newValue = Array.isArray(selector) ? selector.at(0) ?? "" : [selector ?? ""].filter((s) => !!s);
            this.updateItem({ selector: newValue });
        });
        const optionsEl = htmlQuery<HTMLInputElement>(html, ".outcomes");
        tagify(optionsEl, { whitelist: [...DEGREE_OF_SUCCESS_STRINGS], maxTags: 3 });
    }

    override updateObject(ruleData: Partial<Record<string, JSONValue>>): void {
        const shouldBeHidden = htmlQuery<HTMLInputElement>(this.element, ".hidden-value")?.checked;
        const isHidden = ["gm", "owner"].includes(String(this.rule.visibility));
        if (shouldBeHidden !== isHidden) {
            if (shouldBeHidden) {
                ruleData.visibility = "owner";
            } else {
                ruleData.visibility = null;
            }
        }

        if (Array.isArray(ruleData.outcome) && ruleData.outcome.length === 0) {
            delete ruleData.outcome;
        }

        if (typeof ruleData.title === "string") {
            ruleData.title = ruleData.title.trim();
        }

        super.updateObject(ruleData);
    }
}

interface RollNoteFormSheetData extends RuleElementFormSheetData<NoteRESource, RollNoteRuleElement> {
    selectorIsArray: boolean;
}

export { RollNoteForm };
