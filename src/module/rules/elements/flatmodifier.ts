import { PF2RuleElement } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rulesDataDefinitions';
import { CharacterData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2Modifier, PF2ModifierPredicate, PF2ModifierType } from '../../modifiers';
import { PF2EActor } from '../../actor/actor';

/**
 * @category RuleElement
 */
export class PF2FlatModifierRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NpcData, { statisticsModifiers }: PF2RuleElementSynthetics) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const value = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        if (selector && label && value) {
            const modifier = new PF2Modifier(
                this.ruleData.name ?? label,
                value,
                this.ruleData.type ?? PF2ModifierType.UNTYPED,
            );
            modifier.label = label;
            if (this.ruleData.damageType) {
                modifier.damageType = this.ruleData.damageType;
            }
            if (this.ruleData.damageCategory) {
                modifier.damageCategory = this.ruleData.damageCategory;
            }
            if (this.ruleData.predicate) {
                modifier.predicate = new PF2ModifierPredicate(this.ruleData.predicate);
                modifier.ignored = !PF2ModifierPredicate.test(
                    modifier.predicate,
                    PF2EActor.getRollOptions(actorData.flags, this.ruleData['roll-options'] ?? []),
                );
            }
            statisticsModifiers[selector] = (statisticsModifiers[selector] || []).concat(modifier);
        } else {
            console.warn(
                'PF2E | Flat modifier requires at least a selector field, a label field or item name, and a non-zero value field',
            );
        }
    }
}
