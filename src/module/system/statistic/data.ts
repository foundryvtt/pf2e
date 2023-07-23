import { ModifierPF2e, RawModifier } from "@actor/modifiers.ts";
import { AbilityString } from "@actor/types.ts";
import { ZeroToFour } from "@module/data.ts";
import { CheckType } from "@system/check/index.ts";

export interface StatisticCheckData {
    type: CheckType;
    label?: string;
    /** Additional domains for fetching actor roll options */
    domains?: string[];
    /** Modifiers not retrieved from the actor's synthetics record */
    modifiers?: ModifierPF2e[];
}

export interface StatisticDifficultyClassData {
    base?: number;
    /** Additional domains for fetching actor roll options */
    domains?: string[];
    label?: string;
    /** Modifiers not retrieved from the actor's synthetics record */
    modifiers?: ModifierPF2e[];
}

/**
 * Used to build the actual statistic object.
 */
export interface StatisticData {
    /** An identifier such as "reflex" or "ac" or "deception" */
    slug: string;
    ability?: AbilityString | null;
    rank?: ZeroToFour | "untrained-level";
    label: string;
    /** If the actor is proficient with this statistic (rather than deriving from rank) */
    proficient?: boolean;
    lore?: boolean;
    check?: StatisticCheckData;
    dc?: StatisticDifficultyClassData;
    /** Base domains for fetching actor roll options */
    domains?: string[];
    /** Modifiers not retrieved from the actor's synthetics record */
    modifiers?: ModifierPF2e[];
    /** If given, filters all automatically acquired modifiers */
    filter?: (m: ModifierPF2e) => boolean;
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
    modifiers: Required<RawModifier>[];
}
