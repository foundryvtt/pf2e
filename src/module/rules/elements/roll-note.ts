import { RuleElementPF2e } from "../rule-element";
import { RuleElementData, RuleElementSynthetics } from "../rules-data-definitions";
import { CharacterData, NPCData } from "@actor/data";
import { RollNotePF2e } from "@module/notes";
import { ModifierPredicate } from "@module/modifiers";
import { DegreeOfSuccessText, DegreeOfSuccessString } from "@system/check-degree-of-success";

/**
 * @category RuleElement
 */
export class PF2RollNoteRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(_actorData: CharacterData | NPCData, { rollNotes }: RuleElementSynthetics) {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const text = this.resolveInjectedProperties(this.data.text);
        if (selector && text) {
            const note = new RollNotePF2e(selector, text);
            if (this.data.predicate) {
                note.predicate = new ModifierPredicate(this.data.predicate);
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

export interface PF2RollNoteRuleElement {
    data: RuleElementData & {
        outcome?: string[];
        text?: string;
    };
}
