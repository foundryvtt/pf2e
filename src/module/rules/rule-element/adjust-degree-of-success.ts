import { CharacterPF2e, NPCPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { CheckDCModifiers } from "@system/degree-of-success";
import { RuleElementData, RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./";

/**
 * @category RuleElement
 */
class AdjustDegreeOfSuccessRuleElement extends RuleElementPF2e {
    selector: string;

    constructor(data: AdjustDegreeOfSuccessSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
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
        const adjustment = this.data.adjustment;

        const hasData = selector && adjustment && typeof adjustment === "object";
        if (!hasData) {
            return this.failValidation(
                "Degree of success adjustment requires a selector field, a type field and an adjustment object."
            );
        }

        if (!this.#isAdjustmentData(adjustment)) {
            return this.failValidation("Degree of success adjustment does not have the correct format");
        }

        const adjustments = (this.actor.synthetics.degreeOfSuccessAdjustments[selector] ??= []);
        adjustments.push({
            modifiers: adjustment,
            predicate: this.data.predicate,
        });
    }

    #isAdjustmentData(adjustment: CheckDCModifiers): boolean {
        const adjusts = ["criticalFailure", "failure", "success", "criticalSuccess", "all"];
        const modifiers = ["one-degree-better", "one-degree-worse"];
        return Object.entries(adjustment).every(([key, value]) => adjusts.includes(key) && modifiers.includes(value));
    }
}

interface AdjustDegreeOfSuccessRuleElement {
    data: RuleElementData & {
        adjustment?: CheckDCModifiers;
    };

    get actor(): CharacterPF2e | NPCPF2e;
}

interface AdjustDegreeOfSuccessSource extends RuleElementSource {
    selector?: unknown;
}

export { AdjustDegreeOfSuccessRuleElement };
