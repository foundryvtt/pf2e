import { CharacterData, NPCData } from '@actor/data';
import { RuleElementPF2e } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2TogglePropertyRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData) {
        const label = super.getDefaultLabel(this.ruleData, this.item);
        if (label && this.ruleData.property) {
            (actorData.data as any).toggles.actions.push({
                label,
                inputName: this.ruleData.property,
                checked: getProperty(actorData, this.ruleData.property),
            });
        } else {
            console.warn(
                'PF2E | Toggle flag requires at least a label field or item name, and a property field with the name of the property',
            );
        }
    }
}
