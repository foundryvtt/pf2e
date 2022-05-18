import { DCSlug } from "@actor/data";
import { ZeroToThree } from "@module/data";
import { PredicatePF2e } from "./predication";
import { RollDataPF2e } from "./rolls";

/** Get the degree of success from a roll and a difficulty class */
class DegreeOfSuccess {
    /** The calculated degree of success */
    readonly value: DegreeIndex;

    /** The degree of success prior to adjustment. If there was no adjustment, it is identical to the `value` */
    readonly unadjusted: DegreeIndex;

    /** A degree adjustment, usually from some character ability */
    readonly degreeAdjustment: DegreeAdjustment | null;

    /** The result of a d20 roll */
    readonly dieResult: number;

    /** The total of a roll, including the die result and total modifier */
    readonly rollTotal: number;

    /** The check DC being rolled against */
    readonly dc: CheckDC;

    constructor(roll: Rolled<Roll<RollDataPF2e>> | RollBrief, dc: CheckDC | number) {
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

        this.unadjusted = this.calculateDegreeOfSuccess();
        this.degreeAdjustment = this.getDegreeAdjustment(this.unadjusted, this.dc.modifiers ?? {});
        this.value = this.degreeAdjustment
            ? this.adjustDegreeOfSuccess(this.degreeAdjustment, this.unadjusted)
            : this.unadjusted;
    }

    static readonly CRITICAL_FAILURE = 0;
    static readonly FAILURE = 1;
    static readonly SUCCESS = 2;
    static readonly CRITICAL_SUCCESS = 3;

    getDegreeAdjustment(value: DegreeIndex, modifiers: CheckDCModifiers): DegreeAdjustment | null {
        for (const degree of ["all", "criticalFailure", "failure", "success", "criticalSuccess"] as const) {
            const checkDC = modifiers[degree];
            if (!checkDC) continue;
            const condition = PREFIXES[degree];
            const adjustment = ADJUSTMENTS[checkDC];
            if (
                !(value === DegreeOfSuccess.CRITICAL_SUCCESS && adjustment === DEGREE_ADJUSTMENTS.INCREASE) &&
                !(value === DegreeOfSuccess.CRITICAL_FAILURE && adjustment === DEGREE_ADJUSTMENTS.LOWER)
            ) {
                if (condition === PREFIXES.all) {
                    // always return the adjustment
                    return adjustment;
                }
                if (value === condition) {
                    // return the adjustment for the first matching modifier
                    return adjustment;
                }
            }
        }

        return null;
    }

    private adjustDegreeOfSuccess(adjustment: DegreeAdjustment, degreeOfSuccess: DegreeIndex): DegreeIndex {
        return Math.clamped(degreeOfSuccess + adjustment, 0, 3) as DegreeIndex;
    }

    /**
     * @param degree The current success value
     * @return The new success value
     */
    private adjustDegreeByDieValue(degree: DegreeIndex): DegreeIndex {
        if (this.dieResult === 20) {
            return this.adjustDegreeOfSuccess(DEGREE_ADJUSTMENTS.INCREASE, degree);
        } else if (this.dieResult === 1) {
            return this.adjustDegreeOfSuccess(DEGREE_ADJUSTMENTS.LOWER, degree);
        }

        return degree;
    }

    private calculateDegreeOfSuccess(): DegreeIndex {
        const dc = this.dc.value;

        if (this.rollTotal - dc >= 10) {
            return this.adjustDegreeByDieValue(DegreeOfSuccess.CRITICAL_SUCCESS);
        } else if (dc - this.rollTotal >= 10) {
            return this.adjustDegreeByDieValue(DegreeOfSuccess.CRITICAL_FAILURE);
        } else if (this.rollTotal >= dc) {
            return this.adjustDegreeByDieValue(DegreeOfSuccess.SUCCESS);
        }

        return this.adjustDegreeByDieValue(DegreeOfSuccess.FAILURE);
    }
}

type CheckDCString = "one-degree-better" | "one-degree-worse" | "two-degrees-better" | "two-degrees-worse";

type RollBrief = { dieValue: number; modifier: number };

const DEGREE_ADJUSTMENTS = {
    LOWER_BY_TWO: -2,
    LOWER: -1,
    INCREASE: 1,
    INCREASE_BY_TWO: 2,
} as const;

type DegreeAdjustment = typeof DEGREE_ADJUSTMENTS[keyof typeof DEGREE_ADJUSTMENTS];

interface CheckDCModifiers {
    all?: CheckDCString;
    criticalFailure?: CheckDCString;
    failure?: CheckDCString;
    success?: CheckDCString;
    criticalSuccess?: CheckDCString;
}

interface DegreeOfSuccessAdjustment {
    modifiers: CheckDCModifiers;
    predicate?: PredicatePF2e;
}

interface CheckDC {
    slug?: DCSlug;
    label?: string;
    modifiers?: CheckDCModifiers;
    scope?: "attack" | "check";
    adjustments?: DegreeOfSuccessAdjustment[];
    value: number;
    visibility?: "none" | "gm" | "owner" | "all";
}

type DegreeIndex = ZeroToThree;

const ADJUSTMENTS = {
    "two-degrees-better": DEGREE_ADJUSTMENTS.INCREASE_BY_TWO,
    "one-degree-better": DEGREE_ADJUSTMENTS.INCREASE,
    "one-degree-worse": DEGREE_ADJUSTMENTS.LOWER,
    "two-degrees-worse": DEGREE_ADJUSTMENTS.LOWER_BY_TWO,
};

const DEGREE_OF_SUCCESS_STRINGS = ["criticalFailure", "failure", "success", "criticalSuccess"] as const;
type DegreeOfSuccessString = typeof DEGREE_OF_SUCCESS_STRINGS[number];

const PREFIXES = {
    all: -1 as const,
    criticalFailure: DegreeOfSuccess.CRITICAL_FAILURE,
    failure: DegreeOfSuccess.FAILURE,
    success: DegreeOfSuccess.SUCCESS,
    criticalSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
};

export {
    CheckDC,
    CheckDCModifiers,
    DegreeIndex,
    DegreeOfSuccess,
    DegreeOfSuccessAdjustment,
    DegreeOfSuccessString,
    DEGREE_ADJUSTMENTS,
    DEGREE_OF_SUCCESS_STRINGS,
    RollBrief,
};
