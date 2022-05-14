import { RuleElementPF2e } from "./";
import { getStrikingDice } from "@item/runes";
import { WeaponPF2e } from "@item";
import { ActorType } from "@actor/data";
import { PredicatePF2e } from "@system/predication";

/**
 * @category RuleElement
 */
export class StrikingRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override beforePrepareData(): void {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const strikingValue =
            "value" in this.data
                ? this.data.value
                : this.item instanceof WeaponPF2e
                ? getStrikingDice(this.item.data.data)
                : 0;
        const value = this.resolveValue(strikingValue);
        if (selector && typeof value === "number") {
            const label = this.data.label.includes(":")
                ? this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "")
                : this.data.label;
            const striking: StrikingPF2e = { label, bonus: value };
            if (this.data.predicate) {
                striking.predicate = this.data.predicate;
            }
            const strikings = (this.actor.synthetics.striking[selector] ??= []);
            strikings.push(striking);
        } else {
            console.warn("PF2E | Striking requires at least a selector field and a non-empty value field");
        }
    }
}

export interface StrikingPF2e {
    label: string;
    bonus: number;
    predicate?: PredicatePF2e;
}
