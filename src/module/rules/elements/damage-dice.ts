import { PF2RuleElement } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rulesDataDefinitions';
import { CharacterData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2DamageDice } from '../../modifiers';

/**
 * @category RuleElement
 */
export class PF2DamageDiceRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NpcData, { damageDice }: PF2RuleElementSynthetics) {
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
            const dice = new PF2DamageDice(value);
            damageDice[selector] = (damageDice[selector] || []).concat(dice);
        } else {
            console.warn('PF2E | Damage dice requires at least a selector field, and a label field or item name');
        }
    }
}
