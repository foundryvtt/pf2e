import { RuleElementPF2e } from '../rule-element';
import { RuleElementData, RuleElementSyntheticsPF2e } from '../rules-data-definitions';
import { CharacterData, NPCData } from '@actor/data';
import { DamageDicePF2e } from '@module/modifiers';

/**
 * @category RuleElement
 */
export class PF2DamageDiceRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(_actorData: CharacterData | NPCData, { damageDice }: RuleElementSyntheticsPF2e) {
        const value: Omit<DamageDiceRuleElementData, 'key'> & { key?: string } = deepClone(this.data);
        delete value.key;
        if (this.data.value) {
            const bracketed = this.resolveValue(this.data.value);
            mergeObject(value, bracketed, { inplace: true, overwrite: true });
            delete value.value;
        }
        const selector = this.resolveInjectedProperties(value.selector);
        const label = this.getDefaultLabel();
        value.name = this.data.name ?? label;
        value.label = label;
        if (selector && value.name && value) {
            const dice = new DamageDicePF2e(value as Required<DamageDiceRuleElementData>);
            damageDice[selector] = (damageDice[selector] || []).concat(dice);
        } else {
            console.warn('PF2E | Damage dice requires at least a selector field, and a label field or item name');
        }
    }
}

interface DamageDiceRuleElementData extends RuleElementData {
    name?: string;
}

export interface PF2DamageDiceRuleElement {
    data: DamageDiceRuleElementData;
}
