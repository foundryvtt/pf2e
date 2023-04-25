import { StatisticModifier } from "@actor/modifiers.ts";
import { DCSlug } from "@actor/types.ts";
import { ZeroToThree } from "@module/data.ts";
import { CheckRoll } from "./check/roll.ts";
import { PredicatePF2e } from "./predication.ts";
import { StatisticDifficultyClass } from "./statistic/index.ts";

/** Get the degree of success from a roll and a difficulty class */
class DegreeOfSuccess {
    /** The calculated degree of success */
    readonly value: DegreeOfSuccessIndex;

    /** The degree of success prior to adjustment. If there was no adjustment, it is identical to the `value` */
    readonly unadjusted: DegreeOfSuccessIndex;

    /** A degree adjustment, usually from some character ability */
    readonly adjustment: { label: string; amount: DegreeAdjustmentAmount } | null;

    /** The result of a d20 roll */
    readonly dieResult: number;

    /** The total of a roll, including the die result and total modifier */
    readonly rollTotal: number;

    /** The check DC being rolled against */
    readonly dc: CheckDC;

    constructor(
        roll: Rolled<CheckRoll> | RollBrief,
        dc: CheckDC | number,
        dosAdjustments: DegreeAdjustmentsRecord | null = null
    ) {
        if (roll instanceof Roll) {
            this.dieResult =
                (roll.isDeterministic
                    ? roll.terms.find((t): t is NumericTerm => t instanceof NumericTerm)
                    : roll.dice.find((d): d is Die => d instanceof Die && d.faces === 20)
                )?.total ?? 1;
            this.rollTotal = roll.total;
        } else {
            this.dieResult = roll.dieValue;
            this.rollTotal = roll.dieValue + roll.modifier;
        }

        this.dc = typeof dc === "number" ? { value: dc } : dc;

        this.unadjusted = this.#calculateDegreeOfSuccess();
        this.adjustment = this.#getDegreeAdjustment(this.unadjusted, dosAdjustments);
        this.value = this.adjustment
            ? this.#adjustDegreeOfSuccess(this.adjustment.amount, this.unadjusted)
            : this.unadjusted;
    }

    static readonly CRITICAL_FAILURE = 0;
    static readonly FAILURE = 1;
    static readonly SUCCESS = 2;
    static readonly CRITICAL_SUCCESS = 3;

    #getDegreeAdjustment(
        degree: DegreeOfSuccessIndex,
        adjustments: DegreeAdjustmentsRecord | null
    ): { label: string; amount: DegreeAdjustmentAmount } | null {
        if (!adjustments) return null;

        for (const outcome of ["all", ...DEGREE_OF_SUCCESS_STRINGS] as const) {
            const { label, amount } = adjustments[outcome] ?? {};
            if (
                amount &&
                label &&
                !(degree === DegreeOfSuccess.CRITICAL_SUCCESS && amount === DEGREE_ADJUSTMENT_AMOUNTS.INCREASE) &&
                !(degree === DegreeOfSuccess.CRITICAL_FAILURE && amount === DEGREE_ADJUSTMENT_AMOUNTS.LOWER) &&
                (outcome === "all" || DEGREE_OF_SUCCESS_STRINGS.indexOf(outcome) === degree)
            ) {
                return { label, amount };
            }
        }

        return null;
    }

    #adjustDegreeOfSuccess(
        amount: DegreeAdjustmentAmount,
        degreeOfSuccess: DegreeOfSuccessIndex
    ): DegreeOfSuccessIndex {
        switch (amount) {
            case "criticalFailure":
                return 0;
            case "failure":
                return 1;
            case "success":
                return 2;
            case "criticalSuccess":
                return 3;
            default:
                return Math.clamped(degreeOfSuccess + amount, 0, 3) as DegreeOfSuccessIndex;
        }
    }

    /**
     * @param degree The current success value
     * @return The new success value
     */
    #adjustDegreeByDieValue(degree: DegreeOfSuccessIndex): DegreeOfSuccessIndex {
        if (this.dieResult === 20) {
            return this.#adjustDegreeOfSuccess(DEGREE_ADJUSTMENT_AMOUNTS.INCREASE, degree);
        } else if (this.dieResult === 1) {
            return this.#adjustDegreeOfSuccess(DEGREE_ADJUSTMENT_AMOUNTS.LOWER, degree);
        }

        return degree;
    }

    #calculateDegreeOfSuccess(): DegreeOfSuccessIndex {
        const dc = this.dc.value;

        if (this.rollTotal - dc >= 10) {
            return this.#adjustDegreeByDieValue(DegreeOfSuccess.CRITICAL_SUCCESS);
        } else if (dc - this.rollTotal >= 10) {
            return this.#adjustDegreeByDieValue(DegreeOfSuccess.CRITICAL_FAILURE);
        } else if (this.rollTotal >= dc) {
            return this.#adjustDegreeByDieValue(DegreeOfSuccess.SUCCESS);
        }

        return this.#adjustDegreeByDieValue(DegreeOfSuccess.FAILURE);
    }
}

type RollBrief = { dieValue: number; modifier: number };

const DEGREE_ADJUSTMENT_AMOUNTS = {
    LOWER_BY_TWO: -2,
    LOWER: -1,
    INCREASE: 1,
    INCREASE_BY_TWO: 2,
    TO_CRITICAL_FAILURE: "criticalFailure",
    TO_FAILURE: "failure",
    TO_SUCCESS: "success",
    TO_CRITICAL_SUCCESS: "criticalSuccess",
} as const;

type DegreeAdjustmentAmount = (typeof DEGREE_ADJUSTMENT_AMOUNTS)[keyof typeof DEGREE_ADJUSTMENT_AMOUNTS];

type DegreeAdjustmentsRecord = {
    [key in "all" | DegreeOfSuccessString]?: { label: string; amount: DegreeAdjustmentAmount };
};

interface DegreeOfSuccessAdjustment {
    adjustments: DegreeAdjustmentsRecord;
    predicate?: PredicatePF2e;
}

interface CheckDC {
    slug?: DCSlug;
    statistic?: StatisticDifficultyClass | StatisticModifier | null;
    label?: string;
    scope?: "attack" | "check";
    value: number;
    visible?: boolean;
}

const DEGREE_OF_SUCCESS = {
    CRITICAL_SUCCESS: 3,
    SUCCESS: 2,
    FAILURE: 1,
    CRITICAL_FAILURE: 0,
} as const;

type DegreeOfSuccessIndex = ZeroToThree;

const DEGREE_OF_SUCCESS_STRINGS = ["criticalFailure", "failure", "success", "criticalSuccess"] as const;
type DegreeOfSuccessString = (typeof DEGREE_OF_SUCCESS_STRINGS)[number];

export {
    CheckDC,
    DEGREE_ADJUSTMENT_AMOUNTS,
    DEGREE_OF_SUCCESS,
    DEGREE_OF_SUCCESS_STRINGS,
    DegreeAdjustmentAmount,
    DegreeAdjustmentsRecord,
    DegreeOfSuccess,
    DegreeOfSuccessAdjustment,
    DegreeOfSuccessIndex,
    DegreeOfSuccessString,
    RollBrief,
};
