import { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import { ItemPF2e } from "@item";
import {
    DegreeAdjustmentAmount,
    DegreeOfSuccessString,
    DEGREE_ADJUSTMENT_AMOUNTS,
    DEGREE_OF_SUCCESS_STRINGS,
} from "@system/degree-of-success.ts";
import { isObject } from "@util";
import { RuleElementData, RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./index.ts";

/**
 * @category RuleElement
 */
class AdjustDegreeOfSuccessRuleElement extends RuleElementPF2e {
    selector: string;

    constructor(data: AdjustDegreeOfSuccessSource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
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
        const adjustments = this.data.adjustment;

        const hasData = selector && isObject(adjustments);
        if (!hasData) {
            return this.failValidation(
                "Degree of success adjustment requires a selector field and an adjustment object."
            );
        }

        if (!this.#isAdjustmentData(adjustments)) {
            return this.failValidation("Degree of success adjustment does not have the correct format");
        }

        const stringToNumber = {
            "two-degrees-better": DEGREE_ADJUSTMENT_AMOUNTS.INCREASE_BY_TWO,
            "one-degree-better": DEGREE_ADJUSTMENT_AMOUNTS.INCREASE,
            "one-degree-worse": DEGREE_ADJUSTMENT_AMOUNTS.LOWER,
            "two-degrees-worse": DEGREE_ADJUSTMENT_AMOUNTS.LOWER_BY_TWO,
            "to-critical-failure": DEGREE_ADJUSTMENT_AMOUNTS.TO_CRITICAL_FAILURE,
            "to-failure": DEGREE_ADJUSTMENT_AMOUNTS.TO_FAILURE,
            "to-success": DEGREE_ADJUSTMENT_AMOUNTS.TO_SUCCESS,
            "to-critical-success": DEGREE_ADJUSTMENT_AMOUNTS.TO_CRITICAL_SUCCESS,
        } as const;

        const record = (["all", ...DEGREE_OF_SUCCESS_STRINGS] as const).reduce((accumulated, outcome) => {
            const adjustment = adjustments[outcome];
            if (adjustment) {
                accumulated[outcome] = { label: this.label, amount: stringToNumber[adjustment] };
            }
            return accumulated;
        }, {} as { [key in "all" | DegreeOfSuccessString]?: { label: string; amount: DegreeAdjustmentAmount } });

        const synthetics = (this.actor.synthetics.degreeOfSuccessAdjustments[selector] ??= []);
        synthetics.push({
            adjustments: record,
            predicate: this.predicate,
        });
    }

    #isAdjustmentData(adjustment: DegreeAdjustmentsRuleRecord): boolean {
        const outcomes = ["all", ...DEGREE_OF_SUCCESS_STRINGS];
        return Object.entries(adjustment).every(
            ([key, value]) => outcomes.includes(key) && degreeAdjustmentAmountString.includes(value)
        );
    }
}

interface AdjustDegreeOfSuccessRuleElement extends RuleElementPF2e {
    data: RuleElementData & { adjustment?: DegreeAdjustmentsRuleRecord };

    get actor(): CharacterPF2e | NPCPF2e;
}

const degreeAdjustmentAmountString = [
    "one-degree-better",
    "one-degree-worse",
    "two-degrees-better",
    "two-degrees-worse",
    "to-critical-failure",
    "to-failure",
    "to-success",
    "to-critical-success",
] as const;
type DegreeAdjustmentAmountString = (typeof degreeAdjustmentAmountString)[number];

type DegreeAdjustmentsRuleRecord = {
    [key in "all" | DegreeOfSuccessString]?: DegreeAdjustmentAmountString;
};

interface AdjustDegreeOfSuccessSource extends RuleElementSource {
    selector?: unknown;
}

export { AdjustDegreeOfSuccessRuleElement };
