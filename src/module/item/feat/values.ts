const FEAT_CATEGORIES = new Set(["ancestry", "bonus", "class", "general", "skill"] as const);
const FEATURE_CATEGORIES = new Set(["ancestryfeature", "classfeature", "curse", "deityboon", "pfsboon"] as const);

const FEAT_OR_FEATURE_CATEGORIES: Set<SetElement<typeof FEAT_CATEGORIES> | SetElement<typeof FEATURE_CATEGORIES>> =
    new Set([
        "ancestry",
        "ancestryfeature",
        "bonus",
        "class",
        "classfeature",
        "curse",
        "deityboon",
        "general",
        "pfsboon",
        "skill",
    ]);

export { FEAT_OR_FEATURE_CATEGORIES, FEAT_CATEGORIES, FEATURE_CATEGORIES };
