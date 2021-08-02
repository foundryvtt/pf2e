import { RuleElementPF2e } from "../rule-element";
import { RuleElementSynthetics, WeaponPotencyPF2e } from "../rules-data-definitions";
import { CharacterData, NPCData } from "@actor/data";
import { ModifierPredicate } from "@module/modifiers";
import { WeaponPF2e } from "@item";

/**
 * @category RuleElement
 */
export class PF2WeaponPotencyRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(_actorData: CharacterData | NPCData, { weaponPotency }: RuleElementSynthetics) {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const { item } = this;
        const potencyValue = this.data.value ?? (item instanceof WeaponPF2e ? item.data.data.potencyRune.value : 0);
        const value = this.resolveValue(potencyValue);
        if (selector && typeof value === "number") {
            const potency: WeaponPotencyPF2e = { label: this.label, bonus: value };
            if (this.data.predicate) {
                potency.predicate = new ModifierPredicate(this.data.predicate);
            }
            weaponPotency[selector] = (weaponPotency[selector] || []).concat(potency);
        } else {
            console.warn("PF2E | Weapon potency requires at least a selector field and a non-empty value field");
        }
    }
}
