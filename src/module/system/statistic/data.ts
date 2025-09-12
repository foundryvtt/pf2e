import type { ModifierPF2e, RawModifier } from "@actor/modifiers.ts";
import { AttributeString } from "@actor/types.ts";
import { ZeroToFour } from "@module/data.ts";
import { CheckType } from "@system/check/index.ts";

interface BaseStatisticData {
    /** An identifier such as "reflex" or "ac" or "deception" */
    slug: string;
    label: string;
    /** Base domains for fetching actor roll options */
    domains?: string[];
    /** Modifiers not retrieved from the actor's synthetics record */
    modifiers?: ModifierPF2e[];
}

/** Used to build the actual statistic object */
interface StatisticData extends BaseStatisticData {
    attribute?: AttributeString | null;
    rank?: ZeroToFour;
    /** If the actor is proficient with this statistic (rather than deriving from rank) */
    proficient?: boolean;
    lore?: boolean;
    check?: StatisticCheckData;
    dc?: StatisticDifficultyClassData;
    /** If given, filters all automatically acquired modifiers */
    filter?: (m: ModifierPF2e) => boolean;
    /**
     * Any static roll options that should be added to the list of roll options.
     * This does not include actor, rank, or basic item roll options.
     */
    rollOptions?: string[];
}

interface StatisticCheckData {
    type: CheckType;
    label?: string;
    /** Additional domains for fetching actor roll options */
    domains?: string[];
    /** Modifiers not retrieved from the actor's synthetics record */
    modifiers?: ModifierPF2e[];
}

interface StatisticDifficultyClassData {
    /** Additional domains for fetching actor roll options */
    domains?: string[];
    label?: string;
    /** Modifiers not retrieved from the actor's synthetics record */
    modifiers?: ModifierPF2e[];
}

/** Defines view data for chat message and sheet rendering */
interface StatisticChatData {
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

interface BaseStatisticTraceData {
    slug: string;
    label: string;
    /** A numeric value of some kind: semantics determined by `BaseStatistic` subclass */
    value: number;
    breakdown: string;
    modifiers: Required<RawModifier>[];
}

/** Data intended to be merged back into actor data (usually for token attribute/RE purposes) */
interface StatisticTraceData<TAttribute extends AttributeString | null = AttributeString | null>
    extends BaseStatisticTraceData {
    /** Either the totalModifier or the dc depending on what the data is for */
    value: number;
    totalModifier: number;
    dc: number;
    attribute: TAttribute;
}

export type {
    BaseStatisticData,
    BaseStatisticTraceData,
    StatisticChatData,
    StatisticCheckData,
    StatisticData,
    StatisticDifficultyClassData,
    StatisticTraceData,
};
