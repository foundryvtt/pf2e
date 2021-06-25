import { RuleElementPF2e } from '../rule-element';
import { CreatureData } from '@actor/data';
import { SenseAcuity, SenseData } from '@actor/creature/data';

/**
 * @category RuleElement
 */
export class PF2SenseRuleElement extends RuleElementPF2e {
    private static isMoreAcute(replacement?: SenseAcuity, existing?: SenseAcuity): boolean {
        if (!replacement && existing) return false;
        return (
            (replacement && !existing) ||
            (replacement === 'precise' && ['imprecise', 'vague'].includes(existing!)) ||
            (replacement === 'imprecise' && existing === 'vague')
        );
    }

    override onBeforePrepareData(actorData: CreatureData) {
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const range = super.resolveValue(this.ruleData.range, this.ruleData, this.item, actorData);
        if (this.ruleData.selector && label) {
            const existing = actorData.data.traits.senses.find((s) => s.type === this.ruleData.selector);
            const source = `${this.item._id}-${this.item.name}-${this.ruleData.key}`;
            if (existing) {
                // upgrade existing sense, if it has longer range or is more acute
                if (range && existing.value < range) {
                    existing.source = source;
                    existing.value = range;
                }
                if (this.ruleData.acuity && PF2SenseRuleElement.isMoreAcute(this.ruleData.acuity, existing.acuity)) {
                    existing.source = source;
                    existing.acuity = this.ruleData.acuity;
                }
            } else {
                const sense: SenseData & { source: string } = {
                    label,
                    source: source,
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
