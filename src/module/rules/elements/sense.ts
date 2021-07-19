import { RuleElementPF2e } from '../rule-element';
import { SenseAcuity, SenseData } from '@actor/creature/data';
import { RuleElementSource, RuleElementData } from '../rules-data-definitions';
import { CharacterPF2e, FamiliarPF2e } from '@actor';
import { ItemPF2e } from '@item';

/**
 * @category RuleElement
 */
export class PF2SenseRuleElement extends RuleElementPF2e {
    constructor(data: RuleElementSource, item: Embedded<ItemPF2e>) {
        super(data, item);
        if (!(item.actor instanceof CharacterPF2e || item.actor instanceof FamiliarPF2e)) {
            this.ignored = true;
        }
    }

    private static isMoreAcute(replacement?: SenseAcuity, existing?: SenseAcuity): boolean {
        if (!replacement && existing) return false;
        return (
            (replacement && !existing) ||
            (replacement === 'precise' && ['imprecise', 'vague'].includes(existing!)) ||
            (replacement === 'imprecise' && existing === 'vague')
        );
    }

    override onBeforePrepareData(): void {
        if (this.ignored) return;

        const range = this.resolveValue(this.data.range);
        const senses = this.actor.data.data.traits.senses;

        if (this.data.selector) {
            const existing = senses.find((sense) => sense.type === this.data.selector);
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
                    label: this.label,
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
                senses.push(sense);
            }
        } else {
            console.warn('PF2E | Sense requires at least a selector field and a label field or item name');
        }
    }
}

export interface PF2SenseRuleElement {
    get actor(): CharacterPF2e | FamiliarPF2e;

    data: RuleElementData & {
        acuity?: SenseAcuity;
        range?: string;
    };
}
