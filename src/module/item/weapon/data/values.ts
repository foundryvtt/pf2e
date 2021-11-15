export const WEAPON_CATEGORIES = ["unarmed", "simple", "martial", "advanced"] as const;

export const MELEE_WEAPON_GROUPS = [
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
] as const;

export const RANGED_WEAPON_GROUPS = ["bomb", "bow", "dart", "firearm", "sling"] as const;

export const WEAPON_GROUPS = [...MELEE_WEAPON_GROUPS, ...RANGED_WEAPON_GROUPS] as const;

export const WEAPON_RANGES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 150, 180, 240, 300] as const;

// Crossbow isn't a weapon group, so we need to assign it when one of these is a base weapon
export const CROSSBOW_WEAPONS = new Set([
    "alchemical-crossbow",
    "crossbow",
    "hand-crossbow",
    "heavy-crossbow",
    "repeating-crossbow",
    "repeating-hand-crossbow",
    "repeating-heavy-crossbow",
] as const);
