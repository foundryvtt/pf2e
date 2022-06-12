const WEAPON_CATEGORIES = new Set(["unarmed", "simple", "martial", "advanced"] as const);

const MELEE_WEAPON_GROUPS = new Set([
    "axe",
    "brawling",
    "club",
    "flail",
    "hammer",
    "knife",
    "pick",
    "polearm",
    "shield",
    "spear",
    "sword",
] as const);

const RANGED_WEAPON_GROUPS = new Set(["bomb", "bow", "dart", "firearm", "sling"] as const);

const WEAPON_GROUPS = new Set([...MELEE_WEAPON_GROUPS, ...RANGED_WEAPON_GROUPS] as const);

/** Precious materials that provide effects to strike attack or damage rolls */
const WEAPON_MATERIAL_EFFECTS = new Set([
    "abysium",
    "adamantine",
    "coldIron",
    "djezet",
    "silver",
    "mithral",
    "noqual",
    "peachwood",
    "silver",
    "sovereignSteel",
] as const);

const WEAPON_PROPERTY_RUNE_TYPES = new Set([
    "anarchic",
    "ancestralEchoing",
    "anchoring",
    "axiomatic",
    "bane",
    "bloodbane",
    "bloodthirsty",
    "brilliant",
    "conducting",
    "corrosive",
    "crushing",
    "cunning",
    "dancing",
    "disrupting",
    "energizing",
    "extending",
    "fanged",
    "fearsome",
    "flaming",
    "frost",
    "ghostTouch",
    "greaterAnchoring",
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
    "keen",
    "kinWarding",
    "majorFanged",
    "pacifying",
    "returning",
    "serrating",
    "shifting",
    "shock",
    "speed",
    "spellStoring",
    "thundering",
    "unholy",
    "vorpal",
    "wounding",
] as const);

const THROWN_RANGES = new Set([10, 15, 20, 30, 40, 60, 100] as const);
const WEAPON_RANGES = new Set([...THROWN_RANGES, 50, 70, 80, 90, 120, 140, 150, 180, 240, 300] as const);

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
    RANGED_WEAPON_GROUPS,
    THROWN_RANGES,
    WEAPON_CATEGORIES,
    WEAPON_GROUPS,
    WEAPON_MATERIAL_EFFECTS,
    WEAPON_PROPERTY_RUNE_TYPES,
    WEAPON_RANGES,
};
