import { PF2RuleElement } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rulesDataDefinitions';
import { ItemData } from '../../item/dataDefinitions';
import { CharacterData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2RollNote } from '../../notes';
import { PF2ModifierPredicate } from '../../modifiers';

/**
 * @category RuleElement
 */
export class PF2RollNoteRuleElement extends PF2RuleElement {
    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = ruleData;
        this.item = item;
    }

    onBeforePrepareData(actorData: CharacterData | NpcData, { rollNotes }: PF2RuleElementSynthetics) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const text = super.resolveInjectedProperties(this.ruleData.text, this.ruleData, this.item, actorData);
        if (selector && text) {
            const note = new PF2RollNote(selector, text);
            if (this.ruleData.predicate) {
                note.predicate = new PF2ModifierPredicate(this.ruleData.predicate);
            }
            rollNotes[selector] = (rollNotes[selector] || []).concat(note);
        } else {
            console.warn('PF2E | Roll note requires at least a selector field and a non-empty text field');
        }
    }
}
