/** Item types representing the variant components of a PC actor type */
const PC_ITEM_TYPES = ["ancestry", "background", "class", "deity", "feat", "heritage"] as const;

const ITEM_TYPES = [
    "action",
    "affliction",
    "ammo",
    "ancestry",
    "armor",
    "background",
    "backpack",
    "book",
    "campaignFeature",
    "class",
    "condition",
    "consumable",
    "deity",
    "effect",
    "equipment",
    "feat",
    "heritage",
    "kit",
    "lore",
    "melee",
    "shield",
    "spell",
    "spellcastingEntry",
    "treasure",
    "weapon",
] as const;

const EFFECT_AREA_SHAPES = ["burst", "cone", "cube", "cylinder", "emanation", "line", "square"] as const;

export { EFFECT_AREA_SHAPES, ITEM_TYPES, PC_ITEM_TYPES };
