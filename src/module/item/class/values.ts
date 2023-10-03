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
    "kineticist",
    "inventor",
    "investigator",
    "magus",
    "monk",
    "oracle",
    "psychic",
    "ranger",
    "rogue",
    "sorcerer",
    "summoner",
    "swashbuckler",
    "thaumaturge",
    "witch",
    "wizard",
] as const);
