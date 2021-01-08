/**
 * Degree of Success rules as of https://2e.aonprd.com/Rules.aspx?ID=319
 */

export interface DieRoll {
    dieValue: number;
    modifier: number;
}

export enum DegreeOfSuccess {
    CRITICAL_FAILURE,
    FAILURE,
    SUCCESS,
    CRITICAL_SUCCESS,
}

export enum DegreeAdjustment {
    LOWER,
    INCREASE,
}

export function adjustDegreeOfSuccess(adjustment: DegreeAdjustment, degreeOfSuccess: DegreeOfSuccess): DegreeOfSuccess {
    if (adjustment === DegreeAdjustment.INCREASE) {
        return DegreeOfSuccess[DegreeOfSuccess[Math.clamped(degreeOfSuccess + 1, 0, 3)]];
    } else {
        return DegreeOfSuccess[DegreeOfSuccess[Math.clamped(degreeOfSuccess - 1, 0, 3)]];
    }
}

/**
 * @param dieValue rolled number on the die
 * @param degreeOfSuccess current success value
 */
export function adjustDegreeByDieValue(dieValue: number, degreeOfSuccess: DegreeOfSuccess): DegreeOfSuccess {
    if (dieValue === 20) {
        return adjustDegreeOfSuccess(DegreeAdjustment.INCREASE, degreeOfSuccess);
    } else if (dieValue === 1) {
        return adjustDegreeOfSuccess(DegreeAdjustment.LOWER, degreeOfSuccess);
    } else {
        return degreeOfSuccess;
    }
}

export function calculateDegreeOfSuccess(roll: DieRoll, dc: number): DegreeOfSuccess {
    const total = roll.dieValue + roll.modifier;
    if (total - dc >= 10) {
        return adjustDegreeByDieValue(roll.dieValue, DegreeOfSuccess.CRITICAL_SUCCESS);
    } else if (dc - total >= 10) {
        return adjustDegreeByDieValue(roll.dieValue, DegreeOfSuccess.CRITICAL_FAILURE);
    } else if (total >= dc) {
        return adjustDegreeByDieValue(roll.dieValue, DegreeOfSuccess.SUCCESS);
    } else {
        return adjustDegreeByDieValue(roll.dieValue, DegreeOfSuccess.FAILURE);
    }
}
