const CONSUMABLE_CATEGORIES = new Set([
    "ammo",
    "catalyst",
    "drug",
    "elixir",
    "fulu",
    "gadget",
    "mutagen",
    "oil",
    "other",
    "poison",
    "potion",
    "scroll",
    "snare",
    "talisman",
    "toolkit",
    "wand",
] as const);

const DAMAGE_OR_HEALING_CONSUMABLE_CATEGORIES = new Set<SetElement<typeof CONSUMABLE_CATEGORIES>>([
    "ammo",
    "elixir",
    "oil",
    "other",
    "poison",
    "potion",
    "snare",
]);

const DAMAGE_ONLY_CONSUMABLE_CATEGORIES = new Set<SetElement<typeof CONSUMABLE_CATEGORIES>>(["ammo", "snare"]);

export { CONSUMABLE_CATEGORIES, DAMAGE_ONLY_CONSUMABLE_CATEGORIES, DAMAGE_OR_HEALING_CONSUMABLE_CATEGORIES };
