import { Rarity } from "@module/data.ts";
import { PhysicalItemPF2e } from "./document.ts";
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

function getMaterialValuationData(item: PhysicalItemPF2e): MaterialGradeData | null {
    const valuationData = item.isOfType("weapon")
        ? WEAPON_MATERIAL_VALUATION_DATA
        : item.isOfType("armor") && !item.isShield
        ? ARMOR_MATERIAL_VALUATION_DATA
        : null;
    if (!valuationData) return null;

    const { material } = item;
    if (!material.type || !material.grade) return null;

    return valuationData[material.type]?.[material.grade] ?? null;
}

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

const OBJECT_MATERIAL_VALUATION_DATA: MaterialValuationData = {
    "": {
        low: null,
        standard: null,
        high: null,
    },
    abysium: {
        low: null,
        standard: {
            level: 8,
            price: 450,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 7500,
            rarity: "rare",
        },
    },
    adamantine: {
        low: null,
        standard: {
            level: 8,
            price: 350,
            rarity: "uncommon",
        },
        high: {
            level: 16,
            price: 6000,
            rarity: "uncommon",
        },
    },
    "cold-iron": {
        low: {
            level: 2,
            price: 20,
            rarity: "common",
        },
        standard: {
            level: 7,
            price: 250,
            rarity: "common",
        },
        high: {
            level: 15,
            price: 4500,
            rarity: "common",
        },
    },
    darkwood: {
        low: null,
        standard: {
            level: 8,
            price: 350,
            rarity: "uncommon",
        },
        high: {
            level: 16,
            price: 6000,
            rarity: "uncommon",
        },
    },
    djezet: {
        low: null,
        standard: {
            level: 8,
            price: 400,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 7000,
            rarity: "rare",
        },
    },
    inubrix: {
        low: null,
        standard: {
            level: 8,
            price: 400,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 1600,
            rarity: "rare",
        },
    },
    "keep-stone": {
        low: null,
        standard: null,
        high: {
            level: 17,
            price: 9000,
            rarity: "rare",
        },
    },
    mithral: {
        low: null,
        standard: {
            level: 8,
            price: 350,
            rarity: "uncommon",
        },
        high: {
            level: 16,
            price: 6000,
            rarity: "uncommon",
        },
    },
    noqual: {
        low: null,
        standard: {
            level: 8,
            price: 400,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 7000,
            rarity: "rare",
        },
    },
    orichalcum: {
        low: null,
        standard: null,
        high: {
            level: 17,
            price: 10000,
            rarity: "rare",
        },
    },
    peachwood: {
        low: null,
        standard: {
            level: 8,
            price: 500,
            rarity: "uncommon",
        },
        high: {
            level: 16,
            price: 7500,
            rarity: "uncommon",
        },
    },
    siccatite: {
        low: null,
        standard: {
            level: 8,
            price: 350,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 6000,
            rarity: "rare",
        },
    },
    silver: {
        low: {
            level: 2,
            price: 20,
            rarity: "common",
        },
        standard: {
            level: 7,
            price: 250,
            rarity: "common",
        },
        high: {
            level: 15,
            price: 4500,
            rarity: "common",
        },
    },
    sisterstone: {
        low: {
            level: 3,
            price: 30,
            rarity: "rare",
        },
        standard: {
            level: 8,
            price: 350,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 5500,
            rarity: "rare",
        },
    },
    "sovereign-steel": {
        low: null,
        standard: {
            level: 9,
            price: 500,
            rarity: "rare",
        },
        high: {
            level: 17,
            price: 8000,
            rarity: "rare",
        },
    },
    warpglass: {
        low: null,
        standard: null,
        high: {
            level: 17,
            price: 8000,
            rarity: "rare",
        },
    },
};

export {
    ARMOR_MATERIAL_VALUATION_DATA,
    OBJECT_MATERIAL_VALUATION_DATA,
    WEAPON_MATERIAL_VALUATION_DATA,
    getMaterialValuationData,
};
export type { MaterialGradeData, MaterialValuationData };
