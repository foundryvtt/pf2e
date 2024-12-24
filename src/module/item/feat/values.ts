const FEAT_CATEGORIES = new Set(["ancestry", "bonus", "class", "general", "skill"] as const);
const FEATURE_CATEGORIES = new Set([
    "ancestryfeature",
    "calling",
    "classfeature",
    "curse",
    "deityboon",
    "pfsboon",
] as const);

const FEAT_OR_FEATURE_CATEGORIES: Set<SetElement<typeof FEAT_CATEGORIES> | SetElement<typeof FEATURE_CATEGORIES>> =
    new Set([
        "ancestry",
        "ancestryfeature",
        "bonus",
        "calling",
        "class",
        "classfeature",
        "curse",
        "deityboon",
        "general",
        "pfsboon",
        "skill",
    ]);

export { FEATURE_CATEGORIES, FEAT_CATEGORIES, FEAT_OR_FEATURE_CATEGORIES };
