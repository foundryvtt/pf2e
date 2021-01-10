/* global getProperty */
import { ItemData } from '../../item/dataDefinitions';
import { CharacterData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2RuleElement } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rulesDataDefinitions';

/**
 * @category RuleElement
 */
export class PF2TogglePropertyRuleElement extends PF2RuleElement {
    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = ruleData;
        this.item = item;
    }

    onBeforePrepareData(actorData: CharacterData | NpcData, synthetics: PF2RuleElementSynthetics) {
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
