import { RuleElementPF2e, RuleElementSynthetics, WeaponPotencyPF2e } from "./";
import { WeaponPF2e } from "@item";
import { ActorType } from "@actor/data";

/**
 * @category RuleElement
 */
export class WeaponPotencyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override onBeforePrepareData({ weaponPotency }: RuleElementSynthetics) {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.data.selector);
        const { item } = this;
        const potencyValue = this.data.value ?? (item instanceof WeaponPF2e ? item.data.data.potencyRune.value : 0);
        const value = this.resolveValue(potencyValue);
        if (selector && typeof value === "number") {
            const potency: WeaponPotencyPF2e = { label: this.label, bonus: value };
            if (this.data.predicate) {
                potency.predicate = this.data.predicate;
            }
            weaponPotency[selector] = (weaponPotency[selector] || []).concat(potency);
        } else {
            console.warn("PF2E | Weapon potency requires at least a selector field and a non-empty value field");
        }
    }
}
