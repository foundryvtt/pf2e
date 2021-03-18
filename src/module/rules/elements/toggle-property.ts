import { CharacterData, NPCData } from '@actor/data-definitions';
import { PF2RuleElement } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2TogglePropertyRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NPCData) {
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
