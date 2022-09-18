import { ModifierPF2e, RawModifier } from "@actor/modifiers";
import { AbilityString } from "@actor/types";
import { ZeroToFour } from "@module/data";
import { CheckType } from "@system/rolls";

export interface StatisticCheckData {
    type: CheckType;
    label?: string;
    modifiers?: ModifierPF2e[];
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
 */
export interface BaseStatisticData {
    /** An identifier such as "reflex" or "ac" or "deception" */
    slug: string;
    ability?: AbilityString;
    rank?: ZeroToFour | "untrained-level";
    label: string;
    /** If the actor is proficient with this statistic (rather than deriving from rank) */
    proficient?: boolean;
    check?: StatisticCheckData;
    dc?: StatisticDifficultyClassData;
    modifiers?: ModifierPF2e[];
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
