import { DCOptions } from "@module/dc.ts";

/**
 * Rules are implemented as described in https://2e.aonprd.com/Rules.aspx?ID=575
 * including the variant rules for proficiency without level https://2e.aonprd.com/Rules.aspx?ID=1371
 */

// level without proficiency variant
const xpVariantCreatureDifferences = new Map([
    [-7, 9],
    [-6, 12],
    [-5, 14],
    [-4, 18],
    [-3, 21],
    [-2, 26],
    [-1, 32],
    [0, 40],
    [1, 48],
    [2, 60],
    [3, 72],
    [4, 90],
    [5, 108],
    [6, 135],
    [7, 160],
]);

const xpCreatureDifferences = new Map([
    [-4, 10],
    [-3, 15],
    [-2, 20],
    [-1, 30],
    [0, 40],
    [1, 60],
    [2, 80],
    [3, 120],
    [4, 160],
]);

// for some reason Paizo thought it was a good idea to give
// simple hazards entirely different and incredibly small xp values
const xpSimpleHazardDifferences = new Map([
    [-4, 2],
    [-3, 3],
    [-2, 4],
    [-1, 6],
    [0, 8],
    [1, 12],
    [2, 16],
    [3, 24],
    [4, 32],
]);

function getXPFromMap(partyLevel: number, entityLevel: number, values: Map<number, number>): number {
    // add +1 to all levels to account for -1 levels
    const difference = entityLevel + 1 - (partyLevel + 1);
    const range = Math.floor(values.size / 2);
    const boundedDifference = Math.clamped(difference, 0 - range, range);
    return values.get(boundedDifference) ?? 0;
}

function calculateCreatureXP(partyLevel: number, npcLevel: number, dcOptions: DCOptions): number {
    if (dcOptions.proficiencyWithoutLevel) {
        return getXPFromMap(partyLevel, npcLevel, xpVariantCreatureDifferences);
    } else {
        return getXPFromMap(partyLevel, npcLevel, xpCreatureDifferences);
    }
}

function getHazardXp(partyLevel: number, hazard: HazardBrief, dcOptions: DCOptions): number {
    if (hazard.isComplex) {
        return calculateCreatureXP(partyLevel, hazard.level, dcOptions);
    } else {
        return getXPFromMap(partyLevel, hazard.level, xpSimpleHazardDifferences);
    }
}

export interface EncounterBudgets {
    trivial: number;
    low: number;
    moderate: number;
    severe: number;
    extreme: number;
}

function generateEncounterBudgets(partySize: number): EncounterBudgets {
    const budget = partySize * 20;
    return {
        trivial: Math.floor(budget * 0.5),
        low: Math.floor(budget * 0.75),
        moderate: budget,
        severe: Math.floor(budget * 1.5),
        extreme: Math.floor(budget * 2),
    };
}

const rewardEncounterBudgets = generateEncounterBudgets(4);

function calculateEncounterRating(challenge: number, budgets: EncounterBudgets): keyof EncounterBudgets {
    if (challenge <= budgets.trivial) {
        return "trivial";
    } else if (challenge <= budgets.low) {
        return "low";
    } else if (challenge <= budgets.moderate) {
        return "moderate";
    } else if (challenge <= budgets.severe) {
        return "severe";
    } else {
        return "extreme";
    }
}

interface XPCalculation {
    encounterBudgets: EncounterBudgets;
    rating: keyof EncounterBudgets;
    ratingXP: number;
    xpPerPlayer: number;
    totalXP: number;
    partySize: number;
    partyLevel: number;
}

interface HazardBrief {
    level: number;
    isComplex: boolean;
}

function calculateXP(
    partyLevel: number,
    partySize: number,
    npcLevels: number[],
    hazards: HazardBrief[],
    dcOptions: DCOptions
): XPCalculation {
    const creatureChallenge = npcLevels
        .map((level) => calculateCreatureXP(partyLevel, level, dcOptions))
        .reduce((a, b) => a + b, 0);
    const hazardChallenge = hazards
        .map((hazard) => getHazardXp(partyLevel, hazard, dcOptions))
        .reduce((a, b) => a + b, 0);
    const totalXP = creatureChallenge + hazardChallenge;
    const encounterBudgets = generateEncounterBudgets(partySize);
    const rating = calculateEncounterRating(totalXP, encounterBudgets);
    const ratingXP = rewardEncounterBudgets[rating];
    return {
        partyLevel,
        partySize,
        totalXP,
        encounterBudgets,
        rating,
        ratingXP,
        xpPerPlayer: Math.floor((totalXP / partySize) * 4),
    };
}

export { xpFromEncounter } from "./dialog.ts";
export { XPCalculation, calculateXP };
