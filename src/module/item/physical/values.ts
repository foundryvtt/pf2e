const PHYSICAL_ITEM_TYPES = new Set([
    "armor",
    "backpack",
    "book",
    "consumable",
    "equipment",
    "treasure",
    "weapon",
] as const);

const PRECIOUS_MATERIAL_TYPES = new Set([
    "abysium",
    "adamantine",
    "coldIron",
    "darkwood",
    "djezet",
    "dragonhide",
    "grisantian-pelt",
    "inubrix",
    "mithral",
    "noqual",
    "orichalcum",
    "peachwood",
    "siccatite",
    "silver",
    "sovereignSteel",
    "warpglass",
] as const);

const PRECIOUS_MATERIAL_GRADES = new Set(["low", "standard", "high"] as const);

const DENOMINATIONS = ["pp", "gp", "sp", "cp"] as const;

export { DENOMINATIONS, PHYSICAL_ITEM_TYPES, PRECIOUS_MATERIAL_GRADES, PRECIOUS_MATERIAL_TYPES };
