import { RuleElementPF2e } from "./";
import { WeaponPF2e } from "@item";
import { ActorType } from "@actor/data";
import { PredicatePF2e } from "@system/predication";
import { MODIFIER_TYPE } from "@actor/modifiers";
import { WeaponPropertyRuneType } from "@item/weapon/types";

/**
 * Copies potency runes from the weapon its attached to, to another weapon based on a predicate.
 * @category RuleElement
 */
class WeaponPotencyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override beforePrepareData(): void {
        if (this.ignored) return;

        const { weaponPotency } = this.actor.synthetics;
        const selector = this.resolveInjectedProperties(this.data.selector);
        const { item } = this;
        const potencyValue = this.data.value ?? (item instanceof WeaponPF2e ? item.data.data.potencyRune.value : 0);
        const value = this.resolveValue(potencyValue);
        if (selector && typeof value === "number") {
            const bonusType =
                game.settings.get("pf2e", "automaticBonusVariant") === "noABP"
                    ? MODIFIER_TYPE.ITEM
                    : MODIFIER_TYPE.POTENCY;

            const label = this.data.label.includes(":")
                ? this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "")
                : this.data.label;
            const potency: WeaponPotencyPF2e = { label, bonus: value, type: bonusType };
            if (this.data.predicate) {
                potency.predicate = this.data.predicate;
            }
            weaponPotency[selector] = (weaponPotency[selector] || []).concat(potency);
        } else {
            this.failValidation("Weapon potency requires at least a selector field and a non-empty value field");
        }
    }
}

interface WeaponPotencyPF2e {
    label: string;
    bonus: number;
    type: "item" | "potency";
    predicate?: PredicatePF2e;
    property?: WeaponPropertyRuneType[];
}

export { WeaponPotencyRuleElement, WeaponPotencyPF2e };
