import { RuleElementData, RuleElementPF2e, RuleElementSynthetics } from "./";
import { ItemPF2e, WeaponPF2e } from "@item";
import { ActorType } from "@actor/data";
import { RuleElementSource } from "..";
import { getPropertyRunes, getPropertySlots } from "@item/runes";
import { PredicatePF2e } from "@system/predication";
import { MODIFIER_TYPE } from "@module/modifiers";

/**
 * Copies potency runes from the weapon its attached to, to another weapon based on a predicate.
 * @category RuleElement
 */
class WeaponPotencyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    constructor(data: WeaponPotencySource, item: Embedded<ItemPF2e>) {
        super(data, item);
    }

    override onBeforePrepareData({ weaponPotency }: RuleElementSynthetics) {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.data.selector);
        const { item } = this;
        const potencyValue = this.data.value ?? (item instanceof WeaponPF2e ? item.data.data.potencyRune.value : 0);
        const value = this.resolveValue(potencyValue);
        if (selector && typeof value === "number") {
            const bonusType =
                game.settings.get("pf2e", "automaticBonusVariant") === "noABP"
                    ? MODIFIER_TYPE.ITEM
                    : MODIFIER_TYPE.POTENCY;
            const potency: WeaponPotencyPF2e = { label: this.label, bonus: value, type: bonusType };
            if (this.data.predicate) {
                potency.predicate = this.data.predicate;
            }
            if (item instanceof WeaponPF2e && this.data.property) {
                potency.property = getPropertyRunes(item.data, getPropertySlots(item.data));
            }
            weaponPotency[selector] = (weaponPotency[selector] || []).concat(potency);
        } else {
            console.warn("PF2E | Weapon potency requires at least a selector field and a non-empty value field");
        }
    }
}

interface WeaponPotencyRuleElement extends RuleElementPF2e {
    data: WeaponPotencyData;
}

interface WeaponPotencySource extends RuleElementSource {
    property?: boolean;
}

interface WeaponPotencyData extends RuleElementData {
    property?: boolean;
}

interface WeaponPotencyPF2e {
    label: string;
    bonus: number;
    type: "item" | "potency";
    predicate?: PredicatePF2e;
    property?: string[];
}

export { WeaponPotencyRuleElement, WeaponPotencyPF2e };
