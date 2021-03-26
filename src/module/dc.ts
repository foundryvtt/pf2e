/**
 * Implementation of Difficulty Classes https://2e.aonprd.com/Rules.aspx?ID=552
 * and variant rule Proficiency Without Level https://2e.aonprd.com/Rules.aspx?ID=1370
 */

import { ProficiencyRank, Rarity } from '@item/data-definitions';

export type NegativeDCAdjustment = 'incredibly easy' | 'very easy' | 'easy' | 'normal';

export type PositiveDCAdjustment = 'normal' | 'hard' | 'very hard' | 'incredibly hard';

export type DCAdjustment = NegativeDCAdjustment | PositiveDCAdjustment;

const adjustmentScale: DCAdjustment[] = [
    'incredibly easy',
    'very easy',
    'easy',
    'normal',
    'hard',
    'very hard',
    'incredibly hard',
];

const dcAdjustments = new Map<DCAdjustment, number>();
dcAdjustments.set('incredibly easy', -10);
dcAdjustments.set('very easy', -5);
dcAdjustments.set('easy', -2);
dcAdjustments.set('normal', 0);
dcAdjustments.set('hard', 2);
dcAdjustments.set('very hard', 5);
dcAdjustments.set('incredibly hard', 10);

const dcByLevel: number[] = [];
dcByLevel[-1] = 13;
dcByLevel[0] = 14;
dcByLevel[1] = 15;
dcByLevel[2] = 16;
dcByLevel[3] = 18;
dcByLevel[4] = 19;
dcByLevel[5] = 20;
dcByLevel[6] = 22;
dcByLevel[7] = 23;
dcByLevel[8] = 24;
dcByLevel[9] = 26;
dcByLevel[10] = 27;
dcByLevel[11] = 28;
dcByLevel[12] = 30;
dcByLevel[13] = 31;
dcByLevel[14] = 32;
dcByLevel[15] = 34;
dcByLevel[16] = 35;
dcByLevel[17] = 36;
dcByLevel[18] = 38;
dcByLevel[19] = 39;
dcByLevel[20] = 40;
dcByLevel[21] = 42;
dcByLevel[22] = 44;
dcByLevel[23] = 46;
dcByLevel[24] = 48;
dcByLevel[25] = 50;

const simpleDCs = new Map<ProficiencyRank, number>();
simpleDCs.set('untrained', 10);
simpleDCs.set('trained', 15);
simpleDCs.set('expert', 20);
simpleDCs.set('master', 30);
simpleDCs.set('legendary', 40);

const simpleDCsWithoutLevel = new Map<ProficiencyRank, number>();
simpleDCsWithoutLevel.set('untrained', 10);
simpleDCsWithoutLevel.set('trained', 15);
simpleDCsWithoutLevel.set('expert', 20);
simpleDCsWithoutLevel.set('master', 25);
simpleDCsWithoutLevel.set('legendary', 30);

export function rarityToDCAdjustment(rarity: Rarity = 'common'): PositiveDCAdjustment {
    if (rarity === 'uncommon') {
        return 'hard';
    } else if (rarity === 'rare') {
        return 'very hard';
    } else if (rarity === 'unique') {
        return 'incredibly hard';
    } else {
        return 'normal';
    }
}

export function adjustDC(dc: number, adjustment: DCAdjustment = 'normal') {
    return dc + dcAdjustments.get(adjustment);
}

export function adjustDCByRarity(dc: number, rarity: Rarity = 'common') {
    return adjustDC(dc, rarityToDCAdjustment(rarity));
}

export interface DCOptions {
    proficiencyWithoutLevel?: boolean;
}

/**
 * Normal Level Based DCs
 * @param level
 * @param proficiencyWithoutLevel
 */
export function calculateDC(level: number, { proficiencyWithoutLevel = false }: DCOptions = {}): number {
    // assume level 0 if garbage comes in
    const dc = dcByLevel[level] ?? 14;
    if (proficiencyWithoutLevel) {
        // -1 shouldn't be subtracted since it's just
        // a creature level and not related to PC levels
        return dc - Math.max(level, 0);
    } else {
        return dc;
    }
}

export function calculateSimpleDC(rank: ProficiencyRank, { proficiencyWithoutLevel = false }: DCOptions = {}): number {
    if (proficiencyWithoutLevel) {
        return simpleDCsWithoutLevel.get(rank) ?? 10;
    } else {
        return simpleDCs.get(rank) ?? 10;
    }
}

export function calculateSpellDC(spellLevel, { proficiencyWithoutLevel = false }: DCOptions = {}): number {
    return calculateDC(spellLevel * 2 - 1, { proficiencyWithoutLevel });
}

/**
 * Used to shift DCs around the adjustment table Rarity increases
 * the adjustment while Lores reduce it.
 * This function determines which adjustment you start from when you
 * create a difficulty scale from incredibly easy to very hard
 *
 * Important: this operation is not associative because
 * of the lower and upper bounds
 */
export function combineDCAdjustments(first: DCAdjustment, second: DCAdjustment): DCAdjustment {
    const startingIndex = adjustmentScale.indexOf(first);
    const lowerByIndex = adjustmentScale.indexOf(second);
    // -3 because index 3 (normal) is our 0
    const resultIndex = Math.min(Math.max(startingIndex + lowerByIndex - 3, 0), 6);
    return adjustmentScale[resultIndex];
}

/**
 * Given a DC made starting at an adjustment create an array of
 * growing difficulties starting from the adjusted position in
 * the table at https://2e.aonprd.com/Rules.aspx?ID=555
 */
export function createDifficultyScale(dc: number, startAt: DCAdjustment): number[] {
    const beginAtIndex = adjustmentScale.indexOf(startAt);
    return adjustmentScale.filter((_value, index) => index >= beginAtIndex).map((value) => adjustDC(dc, value));
}
