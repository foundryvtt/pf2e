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
export interface StatisticData {
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

/** Defines view data for chat message and sheet rendering */
export interface StatisticChatData {
    slug: string;
    label: string;
    check: {
        label: string;
        mod: number;
        breakdown: string;
        map1: number;
        map2: number;
    };
    dc: {
        value: number;
        breakdown: string;
    };
}

/** Data intended to be merged back into actor data (usually for token attribute/RE purposes) */
export interface StatisticTraceData {
    slug: string;
    label: string;
    totalModifier: number;
    value: number;
    breakdown: string;
    _modifiers: Required<RawModifier>[];
}
