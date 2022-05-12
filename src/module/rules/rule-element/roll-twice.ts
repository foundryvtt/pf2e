import { ItemPF2e } from "@item";
import { RuleElementSource } from ".";
import { RuleElementOptions, RuleElementPF2e } from "./base";
import { RollTwiceSynthetic } from "./data";

/** Roll Twice and keep either the higher or lower result */
export class RollTwiceRuleElement extends RuleElementPF2e {
    selector = "";

    keep: "higher" | "lower" = "higher";

    constructor(data: RollTwiceSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        if (this.#isValid(data)) {
            this.selector = data.selector;
            this.keep = data.keep;
        }
    }

    #isValid(data: RollTwiceSource): data is RollTwiceData {
        if (!(typeof data.selector === "string" && data.selector)) {
            this.failValidation("A Roll Twice rule element requires selector");
            return false;
        }

        if (!(typeof data.keep === "string" && ["higher", "lower"].includes(data.keep))) {
            this.failValidation('A Roll Twice rule element requires a "keep" property of either "higher" or "lower"');
            return false;
        }

        return true;
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const synthetic: RollTwiceSynthetic = { keep: this.keep };
        if (this.predicate) synthetic.predicate = this.predicate;

        const synthetics = (this.actor.synthetics.rollTwice[this.selector] ??= []);
        synthetics.push(synthetic);
    }
}

interface RollTwiceSource extends RuleElementSource {
    keep?: unknown;
}

interface RollTwiceData {
    key: "RollTwice";
    selector: string;
    keep: "higher" | "lower";
}
