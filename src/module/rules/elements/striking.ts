import { PF2RuleElement } from '../rule-element';
import { PF2RuleElementSynthetics, PF2Striking } from '../rulesDataDefinitions';
import { ItemData } from '../../item/dataDefinitions';
import { CharacterData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2ModifierPredicate } from '../../modifiers';

/**
 * @category RuleElement
 */
export class PF2StrikingRuleElement extends PF2RuleElement {
    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = ruleData;
        this.item = item;
    }

    onBeforePrepareData(actorData: CharacterData | NpcData, { striking }: PF2RuleElementSynthetics) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const value = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        if (selector && label && value) {
            const s: PF2Striking = { label, bonus: value };
            if (this.ruleData.predicate) {
                s.predicate = new PF2ModifierPredicate(this.ruleData.predicate);
            }
            striking[selector] = (striking[selector] || []).concat(s);
        } else {
            console.warn('PF2E | Striking requires at least a selector field and a non-empty value field');
        }
    }
}
