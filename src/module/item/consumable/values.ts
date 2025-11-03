const CONSUMABLE_CATEGORIES = new Set([
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
    "elixir",
    "oil",
    "other",
    "poison",
    "potion",
    "snare",
]);

const DAMAGE_ONLY_CONSUMABLE_CATEGORIES = new Set<SetElement<typeof CONSUMABLE_CATEGORIES>>(["snare"]);

export { CONSUMABLE_CATEGORIES, DAMAGE_ONLY_CONSUMABLE_CATEGORIES, DAMAGE_OR_HEALING_CONSUMABLE_CATEGORIES };
