import { RuleElementPF2e } from "../rule-element";
import { RuleElementSynthetics, WeaponPotencyPF2e } from "../rules-data-definitions";
import { ModifierPredicate } from "@module/modifiers";
import { WeaponPF2e } from "@item";
import { ActorType } from "@actor/data";

/**
 * @category RuleElement
 */
export class WeaponPotencyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override onBeforePrepareData(_actorData: unknown, { weaponPotency }: RuleElementSynthetics) {
        if (this.ignored) return;

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
