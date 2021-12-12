import { ModifierPF2e } from "@module/modifiers";
import { RollNotePF2e } from "@module/notes";
import { MultipleAttackPenaltyPF2e } from "@module/rules/rules-data-definitions";
import { DegreeOfSuccessAdjustment } from "@system/check-degree-of-success";
import { RollParameters } from "@system/rolls";

export type AttackCheck = "attack-roll" | "spell-attack-roll";
export type CheckType = "skill-check" | "perception-check" | "saving-throw" | "flat-check" | AttackCheck;

export interface StatisticRollParameters extends RollParameters {
    /** Which attack this is (for the purposes of multiple attack penalty) */
    attackNumber?: number;
}

export interface StatisticCheckData {
    type: CheckType;
    adjustments?: DegreeOfSuccessAdjustment[];
    label?: string;
    modifiers?: ModifierPF2e[];
    penalties?: MultipleAttackPenaltyPF2e[];
    /** Additional domains for fetching actor roll options */
    domains?: string[];
}

export interface StatisticDifficultyClassData {
    base?: number;
    labelKey?: string;
    modifiers?: ModifierPF2e[];
    /** Additional domains for fetching actor roll options */
    domains?: string[];
}

/**
 * The base type for statistic data, which is used to build the actual statistic object.
 * In general, the statistic data should be available in document data, but the actual statistic object
 * does not have to be.
 */
export interface BaseStatisticData {
    name: string;
    check?: StatisticCheckData;
    dc?: StatisticDifficultyClassData;
    modifiers?: ModifierPF2e[];
    notes?: RollNotePF2e[];
    /** Base domains for fetching actor roll options */
    domains?: string[];
}

export type StatisticDataWithCheck = BaseStatisticData & { check: StatisticCheckData };
export type StatisticDataWithDC = BaseStatisticData & { dc: StatisticDifficultyClassData };
/** The complete form of statistic data, able to do used to build a statistic for anything */
export type StatisticData = StatisticDataWithCheck & StatisticDataWithDC;

/** Defines view data for chat message and sheet rendering */
export interface StatisticChatData<T extends BaseStatisticData = StatisticData> {
    check: T["check"] extends object
        ? {
              value: number;
              breakdown: string;
              map1: number;
              map2: number;
          }
        : undefined;
    dc: T["dc"] extends object
        ? {
              value: number;
              breakdown: string;
          }
        : undefined;
}
