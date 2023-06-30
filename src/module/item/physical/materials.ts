import { Rarity } from "@module/data.ts";
import { PreciousMaterialGrade, PreciousMaterialType } from "./types.ts";

interface MaterialGradeData {
    level: number;
    price: number;
    rarity: Rarity;
}

// https://2e.aonprd.com/Equipment.aspx?Category=11&Subcategory=12
// https://2e.aonprd.com/Equipment.aspx?Category=37&Subcategory=38
type MaterialValuationData = Partial<
    Record<PreciousMaterialType | "", Record<PreciousMaterialGrade, MaterialGradeData | null>>
>;

const WEAPON_MATERIAL_VALUATION_DATA: MaterialValuationData = {
    "": {
        low: null,
        standard: null,
        high: null,
    },
    abysium: {
        low: null,
        standard: {
            level: 12,
            price: 2000,
            rarity: "rare",
        },
        high: {
            level: 18,
            price: 24000,
            rarity: "rare",
        },
    },
    adamantine: {
        low: null,
        standard: {
            level: 11,
            price: 1400,
            rarity: "uncommon",
        },
        high: {
            level: 17,
            price: 13500,
            rarity: "uncommon",
        },
    },
    "cold-iron": {
        low: {
            level: 2,
            price: 40,
            rarity: "common",
        },
        standard: {
            level: 10,
            price: 880,
            rarity: "common",
        },
        high: {
            level: 16,
            price: 9000,
            rarity: "common",
        },
    },
    darkwood: {
        low: null,
        standard: {
            level: 11,
            price: 1400,
            rarity: "uncommon",
        },
        high: {
            level: 17,
            price: 13500,
            rarity: "uncommon",
        },
    },
    djezet: {
        low: null,
        standard: {
            level: 12,
            price: 1800,
            rarity: "rare",
        },
        high: {
            level: 18,
            price: 22000,
            rarity: "rare",
        },
    },
    inubrix: {
        low: null,
        standard: {
            level: 11,
            price: 1400,
            rarity: "rare",
        },
        high: {
            level: 17,
            price: 13500,
            rarity: "rare",
        },
    },
    "keep-stone": {
        low: null,
        standard: null,
        high: {
            level: 18,
            price: 22500,
            rarity: "rare",
        },
    },
    mithral: {
        low: null,
        standard: {
            level: 11,
            price: 1400,
            rarity: "uncommon",
        },
        high: {
            level: 17,
            price: 13500,
            rarity: "uncommon",
        },
    },
    noqual: {
        low: null,
        standard: {
            level: 12,
            price: 1600,
            rarity: "rare",
        },
        high: {
            level: 18,
            price: 24000,
            rarity: "rare",
        },
    },
    peachwood: {
        low: null,
        standard: {
            level: 12,
            price: 2000,
            rarity: "uncommon",
        },
        high: {
            level: 18,
            price: 19000,
            rarity: "uncommon",
        },
    },
    orichalcum: {
        low: null,
        standard: null,
        high: {
            level: 18,
            price: 22500,
            rarity: "rare",
        },
    },
    siccatite: {
        low: null,
        standard: {
            level: 11,
            price: 1400,
            rarity: "rare",
        },
        high: {
            level: 17,
            price: 15000,
            rarity: "rare",
        },
    },
    silver: {
        low: {
            level: 2,
            price: 40,
            rarity: "common",
        },
        standard: {
            level: 10,
            price: 880,
            rarity: "common",
        },
        high: {
            level: 16,
            price: 9000,
            rarity: "common",
        },
    },
    "sisterstone-dusk": {
        low: {
            level: 3,
            price: 70,
            rarity: "rare",
        },
        standard: {
            level: 11,
            price: 1200,
            rarity: "rare",
        },
        high: {
            level: 19,
            price: 32000,
            rarity: "rare",
        },
    },
    "sisterstone-scarlet": {
        low: {
            level: 3,
            price: 70,
            rarity: "rare",
        },
        standard: {
            level: 11,
            price: 1200,
            rarity: "rare",
        },
        high: {
            level: 19,
            price: 32000,
            rarity: "rare",
        },
    },
    "sovereign-steel": {
        low: null,
        standard: {
            level: 12,
            price: 1600,
            rarity: "rare",
        },
        high: {
            level: 19,
            price: 32000,
            rarity: "rare",
        },
    },
    warpglass: {
        low: null,
        standard: null,
        high: {
            level: 17,
            price: 14000,
            rarity: "rare",
        },
    },
};

const ARMOR_MATERIAL_VALUATION_DATA: MaterialValuationData = {
    "": {
        low: null,
        standard: null,
        high: null,
    },
    abysium: {
        low: null,
        standard: {
            level: 12,
            price: 2000,
            rarity: "rare",
        },
        high: {
            level: 19,
            price: 40000,
            rarity: "rare",
        },
    },
    adamantine: {
        low: null,
        standard: {
            level: 11,
            price: 1600,
            rarity: "uncommon",
        },
        high: {
            level: 19,
            price: 32000,
            rarity: "uncommon",
        },
    },
    "cold-iron": {
        low: {
            level: 5,
            price: 140,
            rarity: "common",
        },
        standard: {
            level: 11,
            price: 1200,
            rarity: "common",
        },
        high: {
            level: 18,
            price: 20000,
            rarity: "common",
        },
    },
    darkwood: {
        low: null,
        standard: {
            level: 12,
            price: 1600,
            rarity: "uncommon",
        },
        high: {
            level: 19,
            price: 32000,
            rarity: "uncommon",
        },
    },
    djezet: {
        low: null,
        standard: {
            level: 12,
            price: 1800,
            rarity: "rare",
        },
        high: {
            level: 19,
            price: 35000,
            rarity: "rare",
        },
    },
    dragonhide: {
        low: null,
        standard: {
            level: 12,
            price: 1600,
            rarity: "uncommon",
        },
        high: {
            level: 19,
            price: 32000,
            rarity: "uncommon",
        },
    },
    "grisantian-pelt": {
        low: null,
        standard: {
            level: 12,
            price: 1800,
            rarity: "rare",
        },
        high: {
            level: 19,
            price: 33000,
            rarity: "rare",
        },
    },
    inubrix: {
        low: null,
        standard: {
            level: 11,
            price: 1200,
            rarity: "rare",
        },
        high: {
            level: 18,
            price: 18000,
            rarity: "rare",
        },
    },
    "keep-stone": {
        low: null,
        standard: null,
        high: {
            level: 20,
            price: 56000,
            rarity: "rare",
        },
    },
    mithral: {
        low: null,
        standard: {
            level: 12,
            price: 1600,
            rarity: "uncommon",
        },
        high: {
            level: 19,
            price: 32000,
            rarity: "uncommon",
        },
    },
    noqual: {
        low: null,
        standard: {
            level: 12,
            price: 1600,
            rarity: "rare",
        },
        high: {
            level: 19,
            price: 32000,
            rarity: "rare",
        },
    },
    peachwood: {
        low: null,
        standard: null,
        high: null,
    },
    orichalcum: {
        low: null,
        standard: null,
        high: {
            level: 20,
            price: 55000,
            rarity: "rare",
        },
    },
    siccatite: {
        low: null,
        standard: {
            level: 12,
            price: 1600,
            rarity: "rare",
        },
        high: {
            level: 19,
            price: 32000,
            rarity: "rare",
        },
    },
    silver: {
        low: {
            level: 5,
            price: 140,
            rarity: "common",
        },
        standard: {
            level: 11,
            price: 1200,
            rarity: "common",
        },
        high: {
            level: 18,
            price: 20000,
            rarity: "common",
        },
    },
    "sisterstone-dusk": {
        low: {
            level: 5,
            price: 140,
            rarity: "rare",
        },
        standard: {
            level: 10,
            price: 1000,
            rarity: "rare",
        },
        high: {
            level: 18,
            price: 19500,
            rarity: "rare",
        },
    },
    "sisterstone-scarlet": {
        low: {
            level: 5,
            price: 140,
            rarity: "rare",
        },
        standard: {
            level: 10,
            price: 1000,
            rarity: "rare",
        },
        high: {
            level: 18,
            price: 19500,
            rarity: "rare",
        },
    },
    "sovereign-steel": {
        low: null,
        standard: {
            level: 13,
            price: 2400,
            rarity: "rare",
        },
        high: {
            level: 20,
            price: 50000,
            rarity: "rare",
        },
    },
    warpglass: {
        low: null,
        standard: null,
        high: null,
    },
};

export { ARMOR_MATERIAL_VALUATION_DATA, MaterialGradeData, MaterialValuationData, WEAPON_MATERIAL_VALUATION_DATA };
