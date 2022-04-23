/**
 * Classes don't have traits other than rarities, but both feats, spells, and other items can have traits corresponding
 * with a class
 */
export const CLASS_TRAITS = new Set([
    "alchemist",
    "barbarian",
    "bard",
    "champion",
    "cleric",
    "druid",
    "fighter",
    "gunslinger",
    "inventor",
    "investigator",
    "magus",
    "monk",
    "oracle",
    "ranger",
    "rogue",
    "sorcerer",
    "summoner",
    "swashbuckler",
    "witch",
    "wizard",
] as const);
