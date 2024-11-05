import type { Rarity } from "@module/data.ts";
import type { PhysicalItemPF2e } from "./document.ts";
import type { PreciousMaterialGrade, PreciousMaterialType } from "./types.ts";

interface MaterialGradeData {
    level: number;
    price: number;
    hardness?: number;
    maxHP?: number;
    rarity: Rarity;
}

// https://2e.aonprd.com/Equipment.aspx?Category=11&Subcategory=12
// https://2e.aonprd.com/Equipment.aspx?Category=37&Subcategory=38
type MaterialValuationData = Partial<
    Record<PreciousMaterialType | "", Record<PreciousMaterialGrade, MaterialGradeData | null>>
>;

function getMaterialValuationData(item: PhysicalItemPF2e): MaterialGradeData | null {
    const material = item.material;
    if (!material.type || !material.grade) return null;

    const valuationData = item.isOfType("weapon")
        ? MATERIAL_DATA.weapon
        : item.isOfType("armor")
          ? MATERIAL_DATA.armor
          : item.isOfType("shield")
            ? item.isBuckler
                ? MATERIAL_DATA.shield.buckler
                : item.isTowerShield
                  ? MATERIAL_DATA.shield.towerShield
                  : MATERIAL_DATA.shield.shield
            : null;
    if (!valuationData) return null;

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
    dawnsilver: {
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
    duskwood: {
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
    sloughstone: {
        low: null,
        standard: {
            level: 8,
            price: 3500,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 6000,
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
    dawnsilver: {
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
    dreamweb: {
        low: null,
        standard: {
            level: 5,
            price: 150,
            rarity: "rare",
        },
        high: {
            level: 14,
            price: 3000,
            rarity: "rare",
        },
    },
    duskwood: {
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
    dawnsilver: {
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
    duskwood: {
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

const BUCKLER_MATERIAL_VALUATION_DATA: MaterialValuationData = {
    "": {
        low: null,
        standard: null,
        high: null,
    },
    abysium: {
        low: null,
        standard: {
            level: 8,
            price: 400,
            hardness: 4,
            maxHP: 16,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 8000,
            hardness: 7,
            maxHP: 28,
            rarity: "rare",
        },
    },
    adamantine: {
        low: null,
        standard: {
            level: 8,
            price: 400,
            rarity: "uncommon",
            hardness: 8,
            maxHP: 32,
        },
        high: {
            level: 16,
            price: 8000,
            hardness: 11,
            maxHP: 44,
            rarity: "uncommon",
        },
    },
    "cold-iron": {
        low: {
            level: 2,
            price: 30,
            hardness: 3,
            maxHP: 12,
            rarity: "common",
        },
        standard: {
            level: 7,
            price: 300,
            hardness: 5,
            maxHP: 20,
            rarity: "common",
        },
        high: {
            level: 15,
            price: 5000,
            hardness: 8,
            maxHP: 32,
            rarity: "common",
        },
    },
    dawnsilver: {
        low: null,
        standard: {
            level: 8,
            price: 400,
            hardness: 3,
            maxHP: 12,
            rarity: "uncommon",
        },
        high: {
            level: 16,
            price: 8000,
            hardness: 6,
            maxHP: 24,
            rarity: "uncommon",
        },
    },
    djezet: {
        low: null,
        standard: {
            level: 9,
            price: 600,
            hardness: 3,
            maxHP: 12,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 8000,
            hardness: 6,
            maxHP: 24,
            rarity: "rare",
        },
    },
    duskwood: {
        low: null,
        standard: {
            level: 8,
            price: 400,
            hardness: 3,
            maxHP: 12,
            rarity: "uncommon",
        },
        high: {
            level: 16,
            price: 8000,
            hardness: 5,
            maxHP: 20,
            rarity: "uncommon",
        },
    },
    inubrix: {
        low: null,
        standard: {
            level: 7,
            price: 320,
            hardness: 2,
            maxHP: 8,
            rarity: "rare",
        },
        high: {
            level: 15,
            price: 5000,
            hardness: 5,
            maxHP: 20,
            rarity: "rare",
        },
    },
    noqual: {
        low: null,
        standard: null,
        high: {
            level: 17,
            price: 14_000,
            hardness: 7,
            maxHP: 28,
            rarity: "rare",
        },
    },
    orichalcum: {
        low: null,
        standard: null,
        high: {
            level: 17,
            price: 12_000,
            hardness: 14,
            maxHP: 56,
            rarity: "rare",
        },
    },
    siccatite: {
        low: null,
        standard: {
            level: 8,
            price: 400,
            hardness: 4,
            maxHP: 16,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 8000,
            hardness: 7,
            maxHP: 28,
            rarity: "rare",
        },
    },
    silver: {
        low: {
            level: 2,
            price: 30,
            hardness: 1,
            maxHP: 4,
            rarity: "common",
        },
        standard: {
            level: 7,
            price: 300,
            hardness: 3,
            maxHP: 12,
            rarity: "common",
        },
        high: {
            level: 15,
            price: 5000,
            hardness: 6,
            maxHP: 24,
            rarity: "common",
        },
    },
};

const SHIELD_MATERIAL_VALUATION_DATA: MaterialValuationData = {
    "": {
        low: null,
        standard: null,
        high: null,
    },
    abysium: {
        low: null,
        standard: {
            level: 8,
            price: 440,
            hardness: 6,
            maxHP: 24,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 8800,
            hardness: 10,
            maxHP: 40,
            rarity: "rare",
        },
    },
    adamantine: {
        low: null,
        standard: {
            level: 8,
            price: 440,
            rarity: "uncommon",
            hardness: 10,
            maxHP: 40,
        },
        high: {
            level: 16,
            price: 8800,
            hardness: 13,
            maxHP: 52,
            rarity: "uncommon",
        },
    },
    "cold-iron": {
        low: {
            level: 2,
            price: 34,
            hardness: 5,
            maxHP: 20,
            rarity: "common",
        },
        standard: {
            level: 7,
            price: 340,
            hardness: 7,
            maxHP: 28,
            rarity: "common",
        },
        high: {
            level: 15,
            price: 5500,
            hardness: 10,
            maxHP: 40,
            rarity: "common",
        },
    },
    dawnsilver: {
        low: null,
        standard: {
            level: 8,
            price: 440,
            hardness: 5,
            maxHP: 20,
            rarity: "uncommon",
        },
        high: {
            level: 16,
            price: 8800,
            hardness: 8,
            maxHP: 32,
            rarity: "uncommon",
        },
    },
    djezet: {
        low: null,
        standard: {
            level: 9,
            price: 660,
            hardness: 5,
            maxHP: 20,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 8800,
            hardness: 8,
            maxHP: 32,
            rarity: "rare",
        },
    },
    duskwood: {
        low: null,
        standard: {
            level: 8,
            price: 440,
            hardness: 5,
            maxHP: 20,
            rarity: "uncommon",
        },
        high: {
            level: 16,
            price: 8800,
            hardness: 8,
            maxHP: 32,
            rarity: "uncommon",
        },
    },
    inubrix: {
        low: null,
        standard: {
            level: 7,
            price: 352,
            hardness: 4,
            maxHP: 16,
            rarity: "rare",
        },
        high: {
            level: 15,
            price: 5500,
            hardness: 7,
            maxHP: 28,
            rarity: "rare",
        },
    },
    "keep-stone": {
        low: null,
        standard: null,
        high: {
            level: 17,
            price: 13_200,
            hardness: 11,
            maxHP: 46,
            rarity: "rare",
        },
    },
    noqual: {
        low: null,
        standard: null,
        high: {
            level: 17,
            price: 15_400,
            hardness: 10,
            maxHP: 40,
            rarity: "rare",
        },
    },
    orichalcum: {
        low: null,
        standard: null,
        high: {
            level: 17,
            price: 13_200,
            hardness: 16,
            maxHP: 64,
            rarity: "rare",
        },
    },
    siccatite: {
        low: null,
        standard: {
            level: 8,
            price: 440,
            hardness: 6,
            maxHP: 24,
            rarity: "rare",
        },
        high: {
            level: 16,
            price: 8800,
            hardness: 10,
            maxHP: 40,
            rarity: "rare",
        },
    },
    silver: {
        low: {
            level: 2,
            price: 34,
            hardness: 3,
            maxHP: 12,
            rarity: "common",
        },
        standard: {
            level: 7,
            price: 340,
            hardness: 5,
            maxHP: 20,
            rarity: "common",
        },
        high: {
            level: 15,
            price: 5500,
            hardness: 8,
            maxHP: 32,
            rarity: "common",
        },
    },
};

const TOWER_SHIELD_MATERIAL_VALUATION_DATA: MaterialValuationData = {
    "": {
        low: null,
        standard: null,
        high: null,
    },
    duskwood: {
        low: null,
        standard: {
            level: 8,
            price: 560,
            hardness: 5,
            maxHP: 20,
            rarity: "uncommon",
        },
        high: {
            level: 16,
            price: 11_200,
            hardness: 8,
            maxHP: 32,
            rarity: "uncommon",
        },
    },
};

const MATERIAL_DATA = {
    armor: ARMOR_MATERIAL_VALUATION_DATA,
    object: OBJECT_MATERIAL_VALUATION_DATA,
    shield: {
        shield: SHIELD_MATERIAL_VALUATION_DATA,
        buckler: BUCKLER_MATERIAL_VALUATION_DATA,
        towerShield: TOWER_SHIELD_MATERIAL_VALUATION_DATA,
    },
    weapon: WEAPON_MATERIAL_VALUATION_DATA,
};

export { MATERIAL_DATA, OBJECT_MATERIAL_VALUATION_DATA, getMaterialValuationData };

export type { MaterialGradeData, MaterialValuationData };
