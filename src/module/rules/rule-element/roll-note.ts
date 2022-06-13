import { RuleElementPF2e, BracketedValue, RuleElementData } from "./";
import { RollNotePF2e } from "@module/notes";
import { DEGREE_OF_SUCCESS_STRINGS, DegreeOfSuccessString } from "@system/degree-of-success";
import { tupleHasValue } from "@util";

/**
 * @category RuleElement
 */
export class RollNoteRuleElement extends RuleElementPF2e {
    override beforePrepareData(): void {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const text = this.resolveInjectedProperties(String(this.resolveValue(this.data.text, "", { evaluate: false })));
        if (selector && text) {
            const predicate = this.data.predicate ?? {};
            const outcome =
                this.data.outcome?.filter((o: string): o is DegreeOfSuccessString =>
                    tupleHasValue(DEGREE_OF_SUCCESS_STRINGS, o)
                ) ?? [];
            const note = new RollNotePF2e(selector, text, predicate, outcome);
            const notes = (this.actor.synthetics.rollNotes[selector] ??= []);
            notes.push(note);
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
