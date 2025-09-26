/** Item types representing the variant components of a PC actor type */
const PC_ITEM_TYPES = ["ancestry", "background", "class", "deity", "feat", "heritage"] as const;

const ITEM_TYPES = [
    "action",
    "affliction",
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

export { ITEM_TYPES, PC_ITEM_TYPES };
