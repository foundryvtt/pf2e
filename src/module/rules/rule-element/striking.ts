import { ActorPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { ItemPF2e, WeaponPF2e } from "@item";
import { getStrikingDice } from "@item/physical/runes.ts";
import { StrikingSynthetic } from "../synthetics.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./index.ts";

export class StrikingRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    selector: string;

    constructor(data: StrikingSource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
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
            const striking: StrikingSynthetic = {
                label: this.getReducedLabel(),
                bonus: value,
                predicate: this.predicate,
            };
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
