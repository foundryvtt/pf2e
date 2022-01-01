import { RuleElementPF2e, RuleElementSynthetics, StrikingPF2e } from "./";
import { getStrikingDice } from "@item/runes";
import { WeaponPF2e } from "@item";
import { ActorType } from "@actor/data";

/**
 * @category RuleElement
 */
export class StrikingRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override onBeforePrepareData({ striking }: RuleElementSynthetics) {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const strikingValue =
            "value" in this.data
                ? this.data.value
                : this.item instanceof WeaponPF2e
                ? getStrikingDice(this.item.data.data)
                : 0;
        const value = this.resolveValue(strikingValue);
        if (selector && typeof value === "number") {
            const additionalData: StrikingPF2e = { label: this.label, bonus: value };
            if (this.data.predicate) {
                additionalData.predicate = this.data.predicate;
            }
            striking[selector] = (striking[selector] || []).concat(additionalData);
        } else {
            console.warn("PF2E | Striking requires at least a selector field and a non-empty value field");
        }
    }
}
