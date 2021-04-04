import { PF2RuleElement } from '../rule-element';
import { CharacterData, FamiliarData, NPCData } from '@actor/data-definitions';

/**
 * @category RuleElement
 */
export class PF2BaseAttributeRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NPCData | FamiliarData) {
        const value = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        const label = super.getDefaultLabel(this.ruleData, this.item);
        if (this.ruleData.selector && label && value) {
            const attributeName = getMappedAttribute(this.ruleData.selector);
            if (attributeName != null) {
                const existing = (actorData as any).data.attributes[attributeName];
                if (existing != null && existing.base != null) {
                    if (existing.base < value) {
                        existing.base = value;
                        existing.baseSource = label;
                    }
                } else {
                    (actorData as any).data.attributes[attributeName] = { base: value, baseSource: label };
                }
            } else {
                console.warn(
                    'PF2E | Attribute ',
                    this.ruleData.selector,
                    ' is not currently supported for BaseAttribute',
                );
            }
        } else {
            console.warn(
                'PF2E | Base attribute requires at least a selector field, a label field or item name, and a non-zero value field',
            );
        }
    }
}

function getMappedAttribute(attributeName: String) {
    switch (attributeName) {
        case 'familiar-abilities':
            return 'familiarAbilities';
        default:
            return null;
    }
}
