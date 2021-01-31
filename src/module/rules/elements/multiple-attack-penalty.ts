import { PF2RuleElement } from '../rule-element';
import { PF2MultipleAttackPenalty, PF2RuleElementSynthetics } from '../rulesDataDefinitions';
import { CharacterData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2ModifierPredicate } from '../../modifiers';

/**
 * @category RuleElement
 */
export class PF2MultipleAttackPenaltyRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NpcData, { multipleAttackPenalties }: PF2RuleElementSynthetics) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const label = super.resolveInjectedProperties(
            super.getDefaultLabel(this.ruleData, this.item),
            this.ruleData,
            this.item,
            actorData,
        );
        const value = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        if (selector && label && value) {
            const map: PF2MultipleAttackPenalty = { label, penalty: value };
            if (this.ruleData.predicate) {
                map.predicate = new PF2ModifierPredicate(this.ruleData.predicate);
            }
            multipleAttackPenalties[selector] = (multipleAttackPenalties[selector] || []).concat(map);
        } else {
            console.warn(
                'PF2E | Multiple attack penalty requires at least a selector field and a non-empty value field',
            );
        }
    }
}
