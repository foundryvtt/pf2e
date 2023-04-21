import { DEGREE_OF_SUCCESS_STRINGS } from "@system/degree-of-success.ts";
import { tagify } from "@util";
import { RuleElementForm } from "./base.ts";

/** Form handler for the RollNote rule element */
class RollNoteForm extends RuleElementForm {
    private html: HTMLElement | null = null;
    override template = "systems/pf2e/templates/items/rules/note.hbs";
    override activateListeners(html: HTMLElement): void {
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

export { RollNoteForm };
