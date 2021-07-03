import { CharacterData, NPCData } from '@actor/data';
import { RuleElementPF2e } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2DexterityModifierCapRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData) {
        const label = this.getDefaultLabel();
        const value = this.resolveValue(this.data.value);
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
