import { PF2RuleElement } from '../rule-element';
import { CreatureData, SenseData } from '@actor/data-definitions';

/**
 * @category RuleElement
 */
export class PF2SenseRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CreatureData) {
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const range = super.resolveValue(this.ruleData.range, this.ruleData, this.item, actorData);
        if (this.ruleData.selector && label) {
            if (Array.from(actorData.data.traits.senses).some((s) => s.type === this.ruleData.selector)) {
                const sense: SenseData = {
                    label,
                    type: this.ruleData.selector,
                    value: '',
                };
                if (range) {
                    sense.value = range;
                }
                if (this.ruleData.acuity) {
                    sense.acuity = this.ruleData.acuity;
                }
                actorData.data.traits.senses.push(sense);
            }
        } else {
            console.warn('PF2E | Sense requires at least a selector field and a label field or item name');
        }
    }
}
