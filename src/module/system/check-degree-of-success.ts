import {
    DieRoll,
    DegreeAdjustment,
    DegreeAdjustmentValue,
    DegreeOfSuccess,
    calculateDegreeOfSuccess,
    adjustDegreeOfSuccess,
} from "../degree-of-success";
import { PredicatePF2e } from "./predication";
import { RollDataPF2e } from "./rolls";

type CheckDCStrings = "one-degree-better" | "one-degree-worse" | "two-degrees-better" | "two-degrees-worse";

export interface CheckDCModifiers {
    all?: CheckDCStrings;
    criticalFailure?: CheckDCStrings;
    failure?: CheckDCStrings;
    success?: CheckDCStrings;
    criticalSuccess?: CheckDCStrings;
}

export interface DegreeOfSuccessAdjustment {
    modifiers: CheckDCModifiers;
    predicate?: PredicatePF2e;
}

export interface CheckDC {
    label?: string;
    modifiers?: CheckDCModifiers;
    scope?: "AttackOutcome" | "CheckOutcome";
    adjustments?: DegreeOfSuccessAdjustment[];
    value: number;
    visibility?: "none" | "gm" | "owner" | "all";
}

const PREFIXES = Object.freeze({
    all: -1 as const,
    criticalFailure: DegreeOfSuccess.CRITICAL_FAILURE,
    failure: DegreeOfSuccess.FAILURE,
    success: DegreeOfSuccess.SUCCESS,
    criticalSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
});

const ADJUSTMENTS = Object.freeze({
    "two-degrees-better": DegreeAdjustment.INCREASE_BY_TWO,
    "one-degree-better": DegreeAdjustment.INCREASE,
    "one-degree-worse": DegreeAdjustment.LOWER,
    "two-degrees-worse": DegreeAdjustment.LOWER_BY_TWO,
});

export const DEGREE_OF_SUCCESS_STRINGS = ["criticalFailure", "failure", "success", "criticalSuccess"] as const;
export type DegreeOfSuccessString = typeof DEGREE_OF_SUCCESS_STRINGS[number];

export interface DegreeOfSuccessData {
    unadjusted: DegreeOfSuccess;
    value: DegreeOfSuccess;
    degreeAdjustment: DegreeAdjustmentValue | null;
}

export function getDegreeOfSuccess(roll: Rolled<Roll<RollDataPF2e>>, checkDC: CheckDC): DegreeOfSuccessData {
    const dieRoll: DieRoll = {
        dieValue: roll.terms.find((t): t is Die => t instanceof Die)?.total ?? 0,
        modifier: roll.terms.find((t): t is NumericTerm => t instanceof NumericTerm)?.total ?? 0,
    };
    const unadjusted = calculateDegreeOfSuccess(dieRoll, checkDC.value);
    const degreeAdjustment = getDegreeAdjustment(unadjusted, checkDC.modifiers ?? {});
    const value = degreeAdjustment ? adjustDegreeOfSuccess(degreeAdjustment, unadjusted) : unadjusted;

    return {
        unadjusted,
        value,
        degreeAdjustment,
    };
}

function getDegreeAdjustment(value: DegreeOfSuccess, modifiers: CheckDCModifiers): DegreeAdjustmentValue | null {
    for (const degree of ["all", "criticalFailure", "failure", "success", "criticalSuccess"] as const) {
        const checkDC = modifiers[degree];
        if (!checkDC) continue;
        const condition = PREFIXES[degree];
        const adjustment = ADJUSTMENTS[checkDC];
        if (
            !(value === DegreeOfSuccess.CRITICAL_SUCCESS && adjustment === DegreeAdjustment.INCREASE) &&
            !(value === DegreeOfSuccess.CRITICAL_FAILURE && adjustment === DegreeAdjustment.LOWER)
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
