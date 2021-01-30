import { PF2RuleElement } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rulesDataDefinitions';
import { CharacterData, FamiliarData, NpcData } from '../../actor/actorDataDefinitions';

/**
 * @category RuleElement
 */
export class PF2SenseRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NpcData | FamiliarData, synthetics: PF2RuleElementSynthetics) {
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const range = super.resolveValue(this.ruleData.range, this.ruleData, this.item, actorData);
        if (this.ruleData.selector && label) {
            if (!(actorData as any).data.traits.senses.some((s) => s.type === this.ruleData.selector)) {
                const sense: any = {
                    label,
                    type: this.ruleData.selector,
                };
                if (range) {
                    sense.value = range;
                }
                if (this.ruleData.acuity) {
                    sense.acuity = this.ruleData.acuity;
                }
                (actorData as any).data.traits.senses.push(sense);
            }
        } else {
            console.warn('PF2E | Sense requires at least a selector field and a label field or item name');
        }
    }
}
