import { RuleElementPF2e } from '../rule-element';
import { RuleElementSyntheticsPF2e, StrikingPF2e } from '../rules-data-definitions';
import { CharacterData, NPCData } from '@actor/data';
import { ModifierPredicate } from '@module/modifiers';
import { getStrikingDice } from '@item/runes';
import { WeaponPF2e } from '@item';

/**
 * @category RuleElement
 */
export class PF2StrikingRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(_actorData: CharacterData | NPCData, { striking }: RuleElementSyntheticsPF2e) {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const label = this.getDefaultLabel();
        const strikingValue =
            'value' in this.data
                ? this.data.value
                : this.item instanceof WeaponPF2e
                ? getStrikingDice(this.item.data.data)
                : 0;
        const value = this.resolveValue(strikingValue);
        if (selector && label && typeof value === 'number') {
            const s: StrikingPF2e = { label, bonus: value };
            if (this.data.predicate) {
                s.predicate = new ModifierPredicate(this.data.predicate);
            }
            striking[selector] = (striking[selector] || []).concat(s);
        } else {
            console.warn('PF2E | Striking requires at least a selector field and a non-empty value field');
        }
    }
}
