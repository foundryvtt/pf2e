import { AbilityString } from "@actor/data";
import { ZeroToFour } from "@module/data";
import { ModifierPF2e, RawModifier } from "@actor/modifiers";
import { RollNotePF2e } from "@module/notes";
import { MultipleAttackPenaltyPF2e } from "@module/rules/rule-element";
import { DegreeOfSuccessAdjustment } from "@system/degree-of-success";
import { CheckType } from "@system/rolls";

export interface StatisticCheckData {
    type: CheckType;
    label?: string;
    adjustments?: DegreeOfSuccessAdjustment[];
    modifiers?: ModifierPF2e[];
    penalties?: MultipleAttackPenaltyPF2e[];
    /** Additional domains for fetching actor roll options */
    domains?: string[];
}

export interface StatisticDifficultyClassData {
    base?: number;
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
    /** An identifier such as "reflex" or "ac" or "deception" */
    slug: string;
    ability?: AbilityString;
    rank?: ZeroToFour;
    label: string;
    /** If given and rank is omitted, declares if the statistic is with proficiency */
    proficient?: boolean;
    check?: StatisticCheckData;
    dc?: StatisticDifficultyClassData;
    modifiers?: ModifierPF2e[];
    notes?: RollNotePF2e[];
    /** Base domains for fetching actor roll options */
    domains?: string[];
    /**
     * Any static roll options that should be added to the list of roll options.
     * This does not include actor, rank, or basic item roll options.
     */
    rollOptions?: string[];
}

export type StatisticDataWithCheck = BaseStatisticData & { check: StatisticCheckData };
export type StatisticDataWithDC = BaseStatisticData & { dc: StatisticDifficultyClassData };
/** The complete form of statistic data, able to do used to build a statistic for anything */
export type StatisticData = StatisticDataWithCheck & StatisticDataWithDC;

/** Defines view data for chat message and sheet rendering */
export interface StatisticChatData<T extends BaseStatisticData = StatisticData> {
    name: string;
    check: T["check"] extends object
        ? {
              label: string;
              mod: number;
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

export interface StatisticCompatData {
    slug: string;
    name: string;
    totalModifier: number;
    value: number;
    breakdown: string;
    _modifiers: Required<RawModifier>[];
}
