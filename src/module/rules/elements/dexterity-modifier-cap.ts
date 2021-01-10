import { ItemData } from '../../item/dataDefinitions';
import { CharacterData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2RuleElement } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rulesDataDefinitions';

/**
 * @category RuleElement
 */
export class PF2DexterityModifierCapRuleElement extends PF2RuleElement {
    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = ruleData;
        this.item = item;
    }

    onBeforePrepareData(actorData: CharacterData | NpcData, synthetics: PF2RuleElementSynthetics) {
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
