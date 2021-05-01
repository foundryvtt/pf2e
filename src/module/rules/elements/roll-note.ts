import { RuleElementPF2e } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rules-data-definitions';
import { CharacterData, NPCData } from '@actor/data-definitions';
import { PF2RollNote } from '@module/notes';
import { ModifierPredicate } from '@module/modifiers';
import { DegreeOfSuccessText } from '@system/check-degree-of-success';

/**
 * @category RuleElement
 */
export class PF2RollNoteRuleElement extends RuleElementPF2e {
    onBeforePrepareData(actorData: CharacterData | NPCData, { rollNotes }: PF2RuleElementSynthetics) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const text = super.resolveInjectedProperties(this.ruleData.text, this.ruleData, this.item, actorData);
        if (selector && text) {
            const note = new PF2RollNote(selector, text);
            if (this.ruleData.predicate) {
                note.predicate = new ModifierPredicate(this.ruleData.predicate);
            }
            if (Array.isArray(this.ruleData.outcome)) {
                note.outcome = this.ruleData.outcome.filter((outcome: string) =>
                    ((DegreeOfSuccessText as unknown) as string[]).includes(outcome),
                );
            }
            rollNotes[selector] = (rollNotes[selector] || []).concat(note);
        } else {
            console.warn('PF2E | Roll note requires at least a selector field and a non-empty text field');
        }
    }
}
