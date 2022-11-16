import { ModifierPF2e, RawModifier } from "@actor/modifiers";
import { AbilityString } from "@actor/types";
import { ZeroToFour } from "@module/data";
import { CheckType } from "@system/check";

export interface StatisticCheckData {
    type: CheckType;
    label?: string;
    /** Additional domains for fetching actor roll options */
    domains?: string[];
    /** Any additional modifiers not already handled by fetching modifiers using domains as selectors */
    modifiers?: ModifierPF2e[];
}

export interface StatisticDifficultyClassData {
    base?: number;
    /** Additional domains for fetching actor roll options */
    domains?: string[];
    /** Any additional modifiers not already handled by fetching modifiers using domains as selectors */
    modifiers?: ModifierPF2e[];
}

/**
 * Used to build the actual statistic object.
 */
export interface StatisticData {
    /** An identifier such as "reflex" or "ac" or "deception" */
    slug: string;
    ability?: AbilityString;
    rank?: ZeroToFour | "untrained-level";
    label: string;
    /** If the actor is proficient with this statistic (rather than deriving from rank) */
    proficient?: boolean;
    lore?: boolean;
    check?: StatisticCheckData;
    dc?: StatisticDifficultyClassData;
    /** Base domains for fetching actor roll options */
    domains?: string[];
    /** Any additional modifiers not already handled by fetching modifiers using domains as selectors */
    modifiers?: ModifierPF2e[];
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
    rank: number | null;
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
    /** Either the totalModifier or the dc depending on what the data is for */
    value: number;
    totalModifier: number;
    dc: number;
    breakdown: string;
    _modifiers: Required<RawModifier>[];
}
