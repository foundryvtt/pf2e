import { RuleElementPF2e, BracketedValue, RuleElementData, RuleElementSynthetics } from "./";
import { RollNotePF2e } from "@module/notes";
import { DegreeOfSuccessText, DegreeOfSuccessString } from "@system/check-degree-of-success";

/**
 * @category RuleElement
 */
export class RollNoteRuleElement extends RuleElementPF2e {
    override onBeforePrepareData({ rollNotes }: RuleElementSynthetics) {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const text = this.resolveInjectedProperties(String(this.resolveValue(this.data.text, "", { evaluate: false })));
        if (selector && text) {
            const note = new RollNotePF2e(selector, text);
            if (this.data.predicate) {
                note.predicate = this.data.predicate;
            }
            if (Array.isArray(this.data.outcome)) {
                note.outcome = this.data.outcome.filter((outcome: string): outcome is DegreeOfSuccessString =>
                    DegreeOfSuccessText.some((degree) => degree === outcome)
                );
            }
            rollNotes[selector] = (rollNotes[selector] || []).concat(note);
        } else {
            console.warn("PF2E | Roll note requires at least a selector field and a non-empty text field");
        }
    }
}

export interface RollNoteRuleElement {
    data: RuleElementData & {
        outcome?: string[];
        text: BracketedValue | string;
    };
}
