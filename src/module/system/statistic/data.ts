import { ModifierPF2e } from "@module/modifiers";
import { RollNotePF2e } from "@module/notes";
import { DegreeOfSuccessAdjustment } from "@system/check-degree-of-success";

export type AttackCheck = "attack-roll" | "spell-attack-roll";
export type CheckType = "skill-check" | "perception-check" | "saving-throw" | "flat-check" | AttackCheck;

export interface StatisticCheckData {
    adjustments?: DegreeOfSuccessAdjustment[];
    label?: string;
    modifiers?: ModifierPF2e[];
    type: CheckType;
}

export interface StatisticDifficultyClassData {
    base?: number;
    labelKey?: string;
    modifiers?: ModifierPF2e[];
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
          }
        : undefined;
    dc: T["dc"] extends object
        ? {
              value: number;
              breakdown: string;
          }
        : undefined;
}
