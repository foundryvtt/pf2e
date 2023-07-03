const WEAPON_CATEGORIES = new Set(["unarmed", "simple", "martial", "advanced"] as const);

const MELEE_OR_RANGED_GROUPS = new Set(["dart", "knife"] as const);

const MELEE_WEAPON_GROUPS = new Set([
    ...MELEE_OR_RANGED_GROUPS,
    "axe",
    "brawling",
    "club",
    "flail",
    "hammer",
    "pick",
    "polearm",
    "shield",
    "spear",
    "sword",
] as const);

/** Groups that will be forced as ranged weapons */
const MANDATORY_RANGED_GROUPS = new Set(["bomb", "bow", "firearm", "sling"] as const);

const WEAPON_GROUPS = new Set([...MELEE_WEAPON_GROUPS, ...MANDATORY_RANGED_GROUPS] as const);

const WEAPON_PROPERTY_RUNE_TYPES = new Set([
    "anarchic",
    "ancestralEchoing",
    "anchoring",
    "ashen",
    "authorized",
    "axiomatic",
    "bane",
    "bloodbane",
    "bloodthirsty",
    "brilliant",
    "called",
    "coating",
    "conducting",
    "corrosive",
    "crushing",
    "cunning",
    "dancing",
    "deathdrinking",
    "demolishing",
    "disrupting",
    "earthbinding",
    "energizing",
    "extending",
    "fanged",
    "fearsome",
    "flaming",
    "flurrying",
    "frost",
    "ghostTouch",
    "greaterAnchoring",
    "greaterAshen",
    "greaterBloodbane",
    "greaterBrilliant",
    "greaterCorrosive",
    "greaterCrushing",
    "greaterDisrupting",
    "greaterExtending",
    "greaterFanged",
    "greaterFearsome",
    "greaterFlaming",
    "greaterFrost",
    "greaterHauling",
    "greaterImpactful",
    "greaterShock",
    "greaterThundering",
    "grievous",
    "hauling",
    "holy",
    "hopeful",
    "impactful",
    "impossible",
    "keen",
    "kinWarding",
    "majorFanged",
    "merciful",
    "pacifying",
    "returning",
    "serrating",
    "shifting",
    "shock",
    "speed",
    "spellStoring",
    "swarming",
    "thundering",
    "unholy",
    "vorpal",
    "wounding",
] as const);

const THROWN_RANGES = new Set([10, 15, 20, 30, 40, 60, 80, 100] as const);
const WEAPON_RANGES = new Set([...THROWN_RANGES, 50, 70, 90, 120, 140, 150, 180, 200, 240, 300] as const);

// Crossbow isn't a weapon group, so we need to assign it when one of these is a base weapon
const CROSSBOW_WEAPONS = new Set([
    "alchemical-crossbow",
    "crossbow",
    "hand-crossbow",
    "heavy-crossbow",
    "repeating-crossbow",
    "repeating-hand-crossbow",
    "repeating-heavy-crossbow",
    "taw-launcher",
] as const);

export {
    CROSSBOW_WEAPONS,
    MELEE_WEAPON_GROUPS,
    MANDATORY_RANGED_GROUPS,
    THROWN_RANGES,
    WEAPON_CATEGORIES,
    WEAPON_GROUPS,
    WEAPON_PROPERTY_RUNE_TYPES,
    WEAPON_RANGES,
};
