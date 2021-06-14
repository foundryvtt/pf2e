import { RuleElementPF2e } from '../rule-element';
import { MultipleAttackPenaltyPF2e, RuleElementSyntheticsPF2e } from '../rules-data-definitions';
import { CharacterData, NPCData } from '@actor/data';
import { ModifierPredicate } from '@module/modifiers';

/**
 * @category RuleElement
 */
export class PF2MultipleAttackPenaltyRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(
        actorData: CharacterData | NPCData,
        { multipleAttackPenalties }: RuleElementSyntheticsPF2e,
    ) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const label = super.resolveInjectedProperties(
            super.getDefaultLabel(this.ruleData, this.item),
            this.ruleData,
            this.item,
            actorData,
        );
        const value = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        if (selector && label && value) {
            const map: MultipleAttackPenaltyPF2e = { label, penalty: value };
            if (this.ruleData.predicate) {
                map.predicate = new ModifierPredicate(this.ruleData.predicate);
            }
            multipleAttackPenalties[selector] = (multipleAttackPenalties[selector] || []).concat(map);
        } else {
            console.warn(
                'PF2E | Multiple attack penalty requires at least a selector field and a non-empty value field',
            );
        }
    }
}
