import { RuleElementPF2e } from '../rule-element';
import { RuleElementSyntheticsPF2e } from '../rules-data-definitions';
import { CharacterData, NPCData } from '@actor/data';
import { ModifierPF2e, ModifierPredicate, MODIFIER_TYPE } from '@module/modifiers';
import { ActorPF2e } from '@actor/index';

/**
 * @category RuleElement
 */
export class PF2FlatModifierRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(
        actorData: CharacterData | NPCData,
        { statisticsModifiers }: RuleElementSyntheticsPF2e,
    ) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const resolvedValue = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        const value = Math.clamped(
            resolvedValue,
            this.ruleData.min ?? resolvedValue,
            this.ruleData.max ?? resolvedValue,
        );
        if (selector && label && value) {
            const modifier = new ModifierPF2e(
                this.ruleData.name ?? label,
                value,
                this.ruleData.type ?? MODIFIER_TYPE.UNTYPED,
            );
            modifier.label = label;
            if (this.ruleData.damageType) {
                modifier.damageType = this.ruleData.damageType;
            }
            if (this.ruleData.damageCategory) {
                modifier.damageCategory = this.ruleData.damageCategory;
            }
            if (this.ruleData.predicate) {
                modifier.predicate = new ModifierPredicate(this.ruleData.predicate);
                modifier.ignored = !ModifierPredicate.test(
                    modifier.predicate,
                    ActorPF2e.getRollOptions(actorData.flags, this.ruleData['roll-options'] ?? []),
                );
            }
            statisticsModifiers[selector] = (statisticsModifiers[selector] || []).concat(modifier);
        } else if (value === 0) {
            // omit modifiers with a value of zero
        } else if (CONFIG.debug.ruleElement) {
            console.warn(
                'PF2E | Flat modifier requires at least a selector field, a label field or item name, and a value field',
                this.ruleData,
                this.item,
                actorData,
            );
        }
    }
}
