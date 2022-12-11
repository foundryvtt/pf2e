import { Coins } from "@item/physical/data";
import { CoinsPF2e } from "@item/physical/helpers";
import { OneToFour } from "@module/data";
import { calculateDC } from "@module/dc";
import { DegreeOfSuccessIndex, DegreeOfSuccess, RollBrief } from "@system/degree-of-success";

/**
 * Implementation of Earn Income rules on https://2e.aonprd.com/Skills.aspx?ID=2&General=true
 */

// you have to be at least trained to earn income
type Rewards = Record<OneToFour, CoinsPF2e>;

/**
 * There is a cap at each level for a certain proficiency
 * rank. If you go over that, it does not matter what rank
 * you actually performed
 */
function buildRewards(...rewards: Coins[]): Rewards {
    const [trained, expert, master, legendary] = rewards;
    return {
        1: new CoinsPF2e(trained),
        2: new CoinsPF2e(expert ?? trained),
        3: new CoinsPF2e(master ?? expert ?? trained),
        4: new CoinsPF2e(legendary ?? master ?? expert ?? trained),
    };
}

const earnIncomeTable = {
    0: { failure: { cp: 1 }, rewards: buildRewards({ cp: 5 }) },
    1: { failure: { cp: 2 }, rewards: buildRewards({ sp: 2 }) },
    2: { failure: { cp: 4 }, rewards: buildRewards({ sp: 3 }) },
    3: { failure: { cp: 8 }, rewards: buildRewards({ sp: 5 }) },
    4: { failure: { sp: 1 }, rewards: buildRewards({ sp: 7 }, { sp: 8 }) },
    5: { failure: { sp: 2 }, rewards: buildRewards({ sp: 9 }, { gp: 1 }) },
    6: { failure: { sp: 3 }, rewards: buildRewards({ gp: 1, sp: 5 }, { gp: 2 }) },
    7: { failure: { sp: 4 }, rewards: buildRewards({ gp: 2 }, { gp: 2, sp: 5 }) },
    8: { failure: { sp: 5 }, rewards: buildRewards({ gp: 2, sp: 5 }, { gp: 3 }) },
    9: { failure: { sp: 6 }, rewards: buildRewards({ gp: 3 }, { gp: 4 }) },
    10: { failure: { sp: 7 }, rewards: buildRewards({ gp: 4 }, { gp: 5 }, { gp: 6 }) },
    11: { failure: { sp: 8 }, rewards: buildRewards({ gp: 5 }, { gp: 6 }, { gp: 8 }) },
    12: { failure: { sp: 9 }, rewards: buildRewards({ gp: 6 }, { gp: 8 }, { gp: 10 }) },
    13: { failure: { gp: 1 }, rewards: buildRewards({ gp: 7 }, { gp: 10 }, { gp: 15 }) },
    14: { failure: { gp: 1, sp: 5 }, rewards: buildRewards({ gp: 8 }, { gp: 15 }, { gp: 20 }) },
    15: { failure: { gp: 2 }, rewards: buildRewards({ gp: 10 }, { gp: 20 }, { gp: 28 }) },
    16: { failure: { gp: 2, sp: 5 }, rewards: buildRewards({ gp: 13 }, { gp: 25 }, { gp: 36 }, { gp: 40 }) },
    17: { failure: { gp: 3 }, rewards: buildRewards({ gp: 15 }, { gp: 30 }, { gp: 45 }, { gp: 55 }) },
    18: { failure: { gp: 4 }, rewards: buildRewards({ gp: 20 }, { gp: 45 }, { gp: 70 }, { gp: 90 }) },
    19: { failure: { gp: 6 }, rewards: buildRewards({ gp: 30 }, { gp: 60 }, { gp: 100 }, { gp: 130 }) },
    20: { failure: { gp: 8 }, rewards: buildRewards({ gp: 40 }, { gp: 75 }, { gp: 150 }, { gp: 200 }) },
    21: { failure: { cp: 0 }, rewards: buildRewards({ gp: 50 }, { gp: 90 }, { gp: 175 }, { gp: 300 }) },
};

type IncomeLevelMap = typeof earnIncomeTable;
type IncomeEarnerLevel = keyof IncomeLevelMap;
type IncomeForLevel = { failure: CoinsPF2e; rewards: Rewards };
function getIncomeForLevel(level: number): IncomeForLevel {
    const income = earnIncomeTable[Math.clamped(level, 0, 21) as IncomeEarnerLevel];
    return {
        failure: new CoinsPF2e(income.failure),
        rewards: income.rewards,
    };
}

interface PerDayEarnIncomeResult {
    rewards: CoinsPF2e;
    degreeOfSuccess: DegreeOfSuccessIndex;
}

interface EarnIncomeOptions {
    // https://2e.aonprd.com/Feats.aspx?ID=778
    // When you use Lore to Earn Income, if you roll a critical failure, you instead get a failure.
    // If you're an expert in Lore, you gain twice as much income from a failed check to Earn Income,
    // unless it was originally a critical failure.
    useLoreAsExperiencedProfessional: boolean;
}

function applyIncomeOptions({ result, options, level, proficiency }: ApplyIncomeOptionsParams): void {
    if (options.useLoreAsExperiencedProfessional) {
        if (result.degreeOfSuccess === DegreeOfSuccess.CRITICAL_FAILURE) {
            result.degreeOfSuccess = DegreeOfSuccess.FAILURE;
            result.rewards = new CoinsPF2e(getIncomeForLevel(level).failure);
        } else if (result.degreeOfSuccess === DegreeOfSuccess.FAILURE && proficiency !== 1) {
            result.rewards = new CoinsPF2e(result.rewards).scale(2);
        }
    }
}

interface ApplyIncomeOptionsParams {
    result: PerDayEarnIncomeResult;
    options: EarnIncomeOptions;
    level: number;
    proficiency: OneToFour;
}

/**
 * @param level number between 0 and 20
 * @param days how many days you want to work for
 * @param rollBrief the die result and total modifier of a check roll
 * @param proficiency proficiency in the relevant skill
 * @param options feats or items that affect earn income
 * @param dcOptions if dc by level is active
 */
function earnIncome({ level, days, rollBrief, proficiency, options, dc }: EarnIncomeParams): EarnIncomeResult {
    const degree = new DegreeOfSuccess(rollBrief, dc);
    const result = { rewards: new CoinsPF2e(), degreeOfSuccess: degree.value };

    if (degree.value === DegreeOfSuccess.CRITICAL_SUCCESS) {
        result.rewards = getIncomeForLevel(level + 1).rewards[proficiency];
    } else if (degree.value === DegreeOfSuccess.SUCCESS) {
        result.rewards = getIncomeForLevel(level).rewards[proficiency];
    } else if (degree.value === DegreeOfSuccess.FAILURE) {
        result.rewards = getIncomeForLevel(level).failure;
    }

    applyIncomeOptions({ result, options, level, proficiency });

    return {
        rewards: {
            perDay: result.rewards,
            combined: new CoinsPF2e(result.rewards).scale(days),
        },
        degreeOfSuccess: result.degreeOfSuccess,
        daysSpentWorking: days,
        level,
        dc,
        roll: degree.rollTotal,
    };
}

interface EarnIncomeParams {
    level: number;
    days: number;
    rollBrief: RollBrief;
    proficiency: OneToFour;
    options: EarnIncomeOptions;
    dc: number;
}

interface EarnIncomeResult {
    rewards: {
        perDay: CoinsPF2e;
        combined: CoinsPF2e;
    };
    degreeOfSuccess: DegreeOfSuccessIndex;
    daysSpentWorking: number;
    level: number;
    dc: number;
    roll: number;
}

export { EarnIncomeOptions, EarnIncomeResult, PerDayEarnIncomeResult, calculateDC, earnIncome, getIncomeForLevel };
