import { RuleElementPF2e } from '../rule-element';
import { CreatureData } from '@actor/data';
import { SenseAcuity, SenseData } from '@actor/creature/data';
import { RuleElementData } from '../rules-data-definitions';
import { CharacterPF2e, FamiliarPF2e } from '@actor';

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

    override onBeforePrepareData(actorData: CreatureData): void {
        if (!(this.actor instanceof CharacterPF2e || this.actor instanceof FamiliarPF2e)) return;

        const label = this.getDefaultLabel();
        const range = this.resolveValue(this.data.range);
        if (this.data.selector && label) {
            const existing = actorData.data.traits.senses.find((s) => s.type === this.data.selector);
            const source = `${this.item.id}-${this.item.name}-${this.data.key}`;
            if (existing) {
                // upgrade existing sense, if it has longer range or is more acute
                if (range && existing.value < range) {
                    existing.source = source;
                    existing.value = range;
                }
                if (this.data.acuity && PF2SenseRuleElement.isMoreAcute(this.data.acuity, existing.acuity)) {
                    existing.source = source;
                    existing.acuity = this.data.acuity;
                }
            } else {
                const sense: SenseData & { source: string } = {
                    label,
                    source: source,
                    type: this.data.selector,
                    value: '',
                };
                if (range) {
                    sense.value = range;
                }
                if (this.data.acuity) {
                    sense.acuity = this.data.acuity;
                }
                actorData.data.traits.senses.push(sense);
            }
        } else {
            console.warn('PF2E | Sense requires at least a selector field and a label field or item name');
        }
    }
}

export interface PF2SenseRuleElement {
    data: RuleElementData & {
        acuity?: SenseAcuity;
        range?: string;
    };
}
