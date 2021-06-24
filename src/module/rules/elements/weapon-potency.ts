import { RuleElementPF2e } from '../rule-element';
import { RuleElementSyntheticsPF2e, WeaponPotencyPF2e } from '../rules-data-definitions';
import { CharacterData, NPCData } from '@actor/data';
import { ModifierPredicate } from '@module/modifiers';
import { WeaponData } from '@item/weapon/data';

/**
 * @category RuleElement
 */
export class PF2WeaponPotencyRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData, { weaponPotency }: RuleElementSyntheticsPF2e) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const potencyValue =
            'value' in this.ruleData
                ? this.ruleData.value
                : this.item instanceof WeaponData
                ? this.item.data.potencyRune.value
                : 0;
        const value = super.resolveValue(potencyValue, this.ruleData, this.item, actorData);
        if (selector && label && typeof value === 'number') {
            const potency: WeaponPotencyPF2e = { label, bonus: value };
            if (this.ruleData.predicate) {
                potency.predicate = new ModifierPredicate(this.ruleData.predicate);
            }
            weaponPotency[selector] = (weaponPotency[selector] || []).concat(potency);
        } else {
            console.warn('PF2E | Weapon potency requires at least a selector field and a non-empty value field');
        }
    }
}
