import { RuleElementPF2e } from '../rule-element';
import { RuleElementSyntheticsPF2e } from '../rules-data-definitions';
import { CharacterData, NPCData } from '@actor/data';
import { DamageDicePF2e } from '@module/modifiers';

/**
 * @category RuleElement
 */
export class PF2DamageDiceRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData, { damageDice }: RuleElementSyntheticsPF2e) {
        const value = duplicate(this.ruleData);
        delete value.key;
        if (this.ruleData.value) {
            const bracketed = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData, {});
            mergeObject(value, bracketed, { inplace: true, overwrite: true });
            delete value.value;
        }
        const selector = super.resolveInjectedProperties(value.selector, this.ruleData, this.item, actorData);
        const label = super.getDefaultLabel(value, this.item);
        value.name = this.ruleData.name ?? label;
        value.label = label;
        if (selector && value.name && value) {
            const dice = new DamageDicePF2e(value);
            damageDice[selector] = (damageDice[selector] || []).concat(dice);
        } else {
            console.warn('PF2E | Damage dice requires at least a selector field, and a label field or item name');
        }
    }
}
