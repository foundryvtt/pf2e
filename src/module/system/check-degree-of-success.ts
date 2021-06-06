import { ModifierPredicate } from '@module/modifiers';
import {
    DieRoll,
    DegreeAdjustment,
    DegreeOfSuccess,
    calculateDegreeOfSuccess,
    adjustDegreeOfSuccess,
} from '../degree-of-success';
import { RollDataPF2e } from './rolls';

export interface PF2CheckDCModifiers {
    all?: 'one-degree-better' | 'one-degree-worse';
    criticalFailure?: 'one-degree-better' | 'one-degree-worse';
    failure?: 'one-degree-better' | 'one-degree-worse';
    success?: 'one-degree-better' | 'one-degree-worse';
    criticalSuccess?: 'one-degree-better' | 'one-degree-worse';
}

export interface PF2CheckDC {
    label?: string;
    modifiers?: PF2CheckDCModifiers;
    scope?: 'AttackOutcome' | 'CheckOutcome';
    adjustments?: {
        modifiers: PF2CheckDCModifiers;
        predicate: ModifierPredicate;
    }[];
    value: number;
    visibility?: 'gm' | 'owner' | 'all';
}

const PREFIXES = Object.freeze({
    all: -1,
    criticalFailure: DegreeOfSuccess.CRITICAL_FAILURE,
    failure: DegreeOfSuccess.FAILURE,
    success: DegreeOfSuccess.SUCCESS,
    criticalSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
});

const ADJUSTMENTS = Object.freeze({
    'one-degree-better': DegreeAdjustment.INCREASE,
    'one-degree-worse': DegreeAdjustment.LOWER,
});

export const DegreeOfSuccessText = ['criticalFailure', 'failure', 'success', 'criticalSuccess'] as const;
export type DegreeOfSuccessString = typeof DegreeOfSuccessText[number];

export function getDegreeOfSuccess(
    roll: Roll<RollDataPF2e>,
    checkDC: PF2CheckDC,
): { unadjusted: DegreeOfSuccess; value: DegreeOfSuccess; degreeAdjustment: DegreeAdjustment | undefined } {
    const dieRoll: DieRoll = {
        dieValue: Number(roll.terms[0].total) ?? 0,
        modifier: roll.data.totalModifier ?? 0,
    };
    const unadjusted = calculateDegreeOfSuccess(dieRoll, checkDC.value);
    let value = unadjusted;
    const degreeAdjustment = getDegreeAdjustment(value, checkDC.modifiers ?? {});
    if (degreeAdjustment !== undefined) {
        value = adjustDegreeOfSuccess(degreeAdjustment, value);
    }
    return {
        unadjusted,
        value,
        degreeAdjustment,
    };
}

function getDegreeAdjustment(value: DegreeOfSuccess, modifiers: PF2CheckDCModifiers): DegreeAdjustment | undefined {
    for (const [k, v] of Object.entries(modifiers)) {
        const condition = PREFIXES[k];
        const adjustment = ADJUSTMENTS[v];
        if (condition !== undefined && adjustment !== undefined) {
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
    }
    return;
}
