import { CharacterData, NPCData } from '@actor/data';
import { RuleElementPF2e } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2DexterityModifierCapRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData) {
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
