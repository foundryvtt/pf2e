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

const COIN_DENOMINATIONS = ["pp", "gp", "sp", "cp"] as const;
const CURRENCY_TYPES = [...COIN_DENOMINATIONS, "credits", "upb"] as const;

const DENOMINATION_RATES = {
    cp: 1,
    sp: 10,
    gp: 100,
    pp: 1000,
    credits: 10,
    upb: 10,
};

export {
    COIN_DENOMINATIONS,
    CURRENCY_TYPES,
    DENOMINATION_RATES,
    PHYSICAL_ITEM_TYPES,
    PRECIOUS_MATERIAL_GRADES,
    PRECIOUS_MATERIAL_TYPES,
};
