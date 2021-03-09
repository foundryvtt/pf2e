import { PF2RuleElement } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rules-data-definitions';
import { CharacterData, NPCData } from '@actor/actor-data-definitions';
import { ModifierPF2e, PF2ModifierPredicate, ModifierTypePF2e } from '../../modifiers';
import { ActorPF2e } from '../../actor/actor';

/**
 * @category RuleElement
 */
export class PF2FlatModifierRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NPCData, { statisticsModifiers }: PF2RuleElementSynthetics) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const value = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        if (selector && label && value) {
            const modifier = new ModifierPF2e(
                this.ruleData.name ?? label,
                value,
                this.ruleData.type ?? ModifierTypePF2e.UNTYPED,
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
                    ActorPF2e.getRollOptions(actorData.flags, this.ruleData['roll-options'] ?? []),
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
