import { CharacterData, NPCData } from '@actor/data-definitions';
import { PF2RuleElement } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2DexterityModifierCapRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NPCData) {
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const value = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        if (label && value !== undefined) {
            actorData.data.attributes.dexCap = (actorData.data.attributes.dexCap ?? []).concat({
                value,
                source: label,
            });
        } else {
            console.warn('PF2E | Dexterity modifier cap requires at least a label field or item name, and a value');
        }
    }
}
