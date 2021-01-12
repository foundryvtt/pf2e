/**
 * Rules are implemented as described in https://2e.aonprd.com/Rules.aspx?ID=575
 * including the variant rules for proficiency without level https://2e.aonprd.com/Rules.aspx?ID=1371
 */
import { DCOptions } from './dc';

// level without proficiency variant
const xpVariantCreatureDifferences = new Map<number, number>();
xpVariantCreatureDifferences.set(-7, 9);
xpVariantCreatureDifferences.set(-6, 12);
xpVariantCreatureDifferences.set(-5, 14);
xpVariantCreatureDifferences.set(-4, 18);
xpVariantCreatureDifferences.set(-3, 21);
xpVariantCreatureDifferences.set(-2, 26);
xpVariantCreatureDifferences.set(-1, 32);
xpVariantCreatureDifferences.set(0, 40);
xpVariantCreatureDifferences.set(1, 48);
xpVariantCreatureDifferences.set(2, 60);
xpVariantCreatureDifferences.set(3, 72);
xpVariantCreatureDifferences.set(4, 90);
xpVariantCreatureDifferences.set(5, 108);
xpVariantCreatureDifferences.set(6, 135);
xpVariantCreatureDifferences.set(7, 160);

const xpCreatureDifferences = new Map<number, number>();
xpCreatureDifferences.set(-4, 10);
xpCreatureDifferences.set(-3, 15);
xpCreatureDifferences.set(-2, 20);
xpCreatureDifferences.set(-1, 30);
xpCreatureDifferences.set(0, 40);
xpCreatureDifferences.set(1, 60);
xpCreatureDifferences.set(2, 80);
xpCreatureDifferences.set(3, 120);
xpCreatureDifferences.set(4, 160);

// for some reason Paizo thought it was a good idea to give
// simple hazards entirely different and incredibly small xp values
const xpSimpleHazardDifferences = new Map<number, number>();
xpSimpleHazardDifferences.set(-4, 2);
xpSimpleHazardDifferences.set(-3, 3);
xpSimpleHazardDifferences.set(-2, 4);
xpSimpleHazardDifferences.set(-1, 6);
xpSimpleHazardDifferences.set(0, 8);
xpSimpleHazardDifferences.set(1, 12);
xpSimpleHazardDifferences.set(2, 16);
xpSimpleHazardDifferences.set(3, 24);
xpSimpleHazardDifferences.set(4, 32);

function getXPFromMap(partyLevel: number, entityLevel: number, values: Map<number, number>): number {
    // add +1 to all levels to account for -1 levels
    const difference = entityLevel + 1 - (partyLevel + 1);
    const range = Math.floor(values.size / 2);
    const boundedDifference = Math.clamped(difference, 0 - range, range);
    return values.get(boundedDifference);
}

function calculateCreatureXP(partyLevel: number, npcLevel: number, dcOptions: DCOptions): number {
    if (dcOptions.proficiencyWithoutLevel) {
        return getXPFromMap(partyLevel, npcLevel, xpVariantCreatureDifferences);
    } else {
        return getXPFromMap(partyLevel, npcLevel, xpCreatureDifferences);
    }
}

interface HazardLevel {
    level: number;
    isComplex: boolean;
}

function getHazardXp(partyLevel: number, hazard: HazardLevel, dcOptions: DCOptions): number {
    if (hazard.isComplex) {
        return calculateCreatureXP(partyLevel, hazard.level, dcOptions);
    } else {
        return getXPFromMap(partyLevel, hazard.level, xpSimpleHazardDifferences);
    }
}

export type EncounterBudget = 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme';

export interface EncounterBudgets {
    trivial: number;
    low: number;
    moderate: number;
    severe: number;
    extreme: number;
}

function calculateEncounterRating(challenge: number, budgets: EncounterBudgets): EncounterBudget {
    if (challenge < budgets.low) {
        return 'trivial';
    } else if (challenge < budgets.moderate) {
        return 'low';
    } else if (challenge < budgets.severe) {
        return 'moderate';
    } else if (challenge < budgets.extreme) {
        return 'severe';
    } else {
        return 'extreme';
    }
}

interface XP {
    encounterBudgets: EncounterBudgets;
    rating: EncounterBudget;
    xpPerPlayer: number;
    totalXP: number;
    partySize: number;
    partyLevel: number;
}

export function calculateXP(
    partyLevel: number,
    partySize: number,
    npcLevels: number[],
    hazards: HazardLevel[],
    dcOptions: DCOptions,
): XP {
    const budget = partySize * 20;
    const creatureChallenge = npcLevels
        .map((level) => calculateCreatureXP(partyLevel, level, dcOptions))
        .reduce((a, b) => a + b, 0);
    const hazardChallenge = hazards
        .map((hazard) => getHazardXp(partyLevel, hazard, dcOptions))
        .reduce((a, b) => a + b, 0);
    const totalXP = creatureChallenge + hazardChallenge;
    const encounterBudgets = {
        trivial: Math.floor(budget * 0.5),
        low: Math.floor(budget * 0.75),
        moderate: budget,
        severe: Math.floor(budget * 1.5),
        extreme: Math.floor(budget * 2),
    };
    const rating = calculateEncounterRating(totalXP, encounterBudgets);
    return {
        partyLevel,
        partySize,
        totalXP,
        encounterBudgets,
        rating,
        xpPerPlayer: Math.floor((totalXP / partySize) * 4),
    };
}
