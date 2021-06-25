import { RuleElementPF2e } from '../rule-element';
import { RuleElementSyntheticsPF2e, StrikingPF2e } from '../rules-data-definitions';
import { CharacterData, NPCData } from '@actor/data';
import { ModifierPredicate } from '../../modifiers';
import { getStrikingDice } from '@item/runes';
import { WeaponData } from '@item/weapon/data';

/**
 * @category RuleElement
 */
export class PF2StrikingRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData, { striking }: RuleElementSyntheticsPF2e) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const strikingValue =
            'value' in this.ruleData
                ? this.ruleData.value
                : this.item instanceof WeaponData
                ? getStrikingDice(this.item.data)
                : 0;
        const value = super.resolveValue(strikingValue, this.ruleData, this.item, actorData);
        if (selector && label && typeof value === 'number') {
            const s: StrikingPF2e = { label, bonus: value };
            if (this.ruleData.predicate) {
                s.predicate = new ModifierPredicate(this.ruleData.predicate);
            }
            striking[selector] = (striking[selector] || []).concat(s);
        } else {
            console.warn('PF2E | Striking requires at least a selector field and a non-empty value field');
        }
    }
}
