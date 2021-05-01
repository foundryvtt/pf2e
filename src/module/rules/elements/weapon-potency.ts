import { RuleElementPF2e } from '../rule-element';
import { PF2RuleElementSynthetics, PF2WeaponPotency } from '../rules-data-definitions';
import { CharacterData, NPCData } from '@actor/data-definitions';
import { ModifierPredicate } from '@module/modifiers';

/**
 * @category RuleElement
 */
export class PF2WeaponPotencyRuleElement extends RuleElementPF2e {
    onBeforePrepareData(actorData: CharacterData | NPCData, { weaponPotency }: PF2RuleElementSynthetics) {
        const selector = super.resolveInjectedProperties(this.ruleData.selector, this.ruleData, this.item, actorData);
        const label = super.getDefaultLabel(this.ruleData, this.item);
        const value = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
        if (selector && label && value) {
            const potency: PF2WeaponPotency = { label, bonus: value };
            if (this.ruleData.predicate) {
                potency.predicate = new ModifierPredicate(this.ruleData.predicate);
            }
            weaponPotency[selector] = (weaponPotency[selector] || []).concat(potency);
        } else {
            console.warn('PF2E | Weapon potency requires at least a selector field and a non-empty value field');
        }
    }
}
