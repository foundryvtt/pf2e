import { PF2RuleElement } from '../rule-element';
import { ItemData } from '../../item/dataDefinitions';
import { PF2RuleElementSynthetics } from '../rulesDataDefinitions';
import { CharacterData, FamiliarData, NpcData } from '../../actor/actorDataDefinitions';

/**
 * @category RuleElement
 */
export class PF2BaseSpeedRuleElement extends PF2RuleElement {
    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = ruleData;
        this.item = item;
    }

    onBeforePrepareData(actorData: CharacterData | NpcData | FamiliarData, synthetics: PF2RuleElementSynthetics) {
        const value = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        const label = super.getDefaultLabel(this.ruleData, this.item);
        if (this.ruleData.selector && label && value) {
            const selector = this.ruleData.selector.endsWith('-speed')
                ? this.ruleData.selector.substring(-6)
                : this.ruleData.selector;
            const existing = (actorData as any).data.attributes.speed.otherSpeeds.find((speed) => {
                return speed.type === selector;
            });
            if (existing) {
                if (existing.value < value) {
                    existing.value = value;
                }
            } else {
                (actorData as any).data.attributes.speed.otherSpeeds.push({
                    label: selector.charAt(0).toUpperCase() + selector.slice(1),
                    type: selector,
                    value,
                });
            }
        } else {
            console.warn(
                'PF2E | Base speed requires at least a selector field, a label field or item name, and a non-zero value field',
            );
        }
    }
}
