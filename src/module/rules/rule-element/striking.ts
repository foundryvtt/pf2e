import { ActorType } from "@actor/data";
import { ItemPF2e, WeaponPF2e } from "@item";
import { getStrikingDice } from "@item/physical/runes";
import { StrikingSynthetic } from "../synthetics";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./";

export class StrikingRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    selector: string;

    constructor(data: StrikingSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        if (typeof data.selector === "string") {
            this.selector = data.selector;
        } else {
            this.failValidation("Missing string selector property");
            this.selector = "";
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);
        const strikingValue =
            "value" in this.data
                ? this.data.value
                : this.item instanceof WeaponPF2e
                ? getStrikingDice(this.item.system)
                : 0;
        const value = this.resolveValue(strikingValue);
        if (selector && typeof value === "number") {
            const label = this.data.label.includes(":")
                ? this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "")
                : this.data.label;
            const striking: StrikingSynthetic = { label, bonus: value, predicate: this.predicate };
            const strikings = (this.actor.synthetics.striking[selector] ??= []);
            strikings.push(striking);
        } else {
            console.warn("PF2E | Striking requires at least a selector field and a non-empty value field");
        }
    }
}

interface StrikingSource extends RuleElementSource {
    selector?: string;
}
