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

const AMMO_STACK_GROUPS = new Set([
    "arrows",
    "blowgunDarts",
    "bolts",
    "rounds5",
    "rounds10",
    "slingBullets",
    "sprayPellets",
    "woodenTaws",
] as const);

export {
    AMMO_STACK_GROUPS,
    CONSUMABLE_CATEGORIES,
    DAMAGE_ONLY_CONSUMABLE_CATEGORIES,
    DAMAGE_OR_HEALING_CONSUMABLE_CATEGORIES,
};
