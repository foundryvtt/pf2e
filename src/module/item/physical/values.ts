const PHYSICAL_ITEM_TYPES = new Set([
    "ammo",
    "armor",
    "backpack",
    "book",
    "consumable",
    "equipment",
    "shield",
    "treasure",
    "weapon",
] as const);

const PRECIOUS_MATERIAL_TYPES = new Set([
    "abysium",
    "adamantine",
    "cold-iron",
    "duskwood",
    "djezet",
    "dragonhide",
    "dreamweb",
    "grisantian-pelt",
    "inubrix",
    "keep-stone",
    "dawnsilver",
    "noqual",
    "orichalcum",
    "peachwood",
    "siccatite",
    "silver",
    "sisterstone",
    "sisterstone-dusk",
    "sisterstone-scarlet",
    "sloughstone",
    "sovereign-steel",
    "warpglass",
] as const);

const PRECIOUS_MATERIAL_GRADES = new Set(["low", "standard", "high"] as const);

const DENOMINATIONS = ["pp", "gp", "sp", "cp"] as const;

export { DENOMINATIONS, PHYSICAL_ITEM_TYPES, PRECIOUS_MATERIAL_GRADES, PRECIOUS_MATERIAL_TYPES };
