const CHARACTER_SHEET_TABS = [
    "character",
    "actions",
    "inventory",
    "spellcasting",
    "crafting",
    "proficiencies",
    "feats",
    "effects",
    "biography",
    "pfs",
] as const;

const CORE_RESOURCES = ["hero-points", "focus", "investiture", "resolve", "mythic-points"] as const;

export { CHARACTER_SHEET_TABS, CORE_RESOURCES };
