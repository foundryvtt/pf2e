import { Rarity } from '@module/data';
import { PreciousMaterialGrade, PreciousMaterialType } from './data';

export interface MaterialGradeData {
    level: number;
    price: number;
    rarity: Rarity;
}

// https://2e.aonprd.com/Equipment.aspx?Category=11&Subcategory=12
// https://2e.aonprd.com/Equipment.aspx?Category=37&Subcategory=38
export type MaterialValuationData = Record<
    PreciousMaterialType | '',
    Record<PreciousMaterialGrade, MaterialGradeData | null>
>;
export const MATERIAL_VALUATION_DATA: MaterialValuationData = {
    '': {
        low: null,
        standard: null,
        high: null,
    },
    adamantine: {
        low: null,
        standard: {
            level: 11,
            price: 1400,
            rarity: 'uncommon',
        },
        high: {
            level: 17,
            price: 13500,
            rarity: 'uncommon',
        },
    },
    coldIron: {
        low: {
            level: 2,
            price: 40,
            rarity: 'common',
        },
        standard: {
            level: 10,
            price: 880,
            rarity: 'common',
        },
        high: {
            level: 16,
            price: 9000,
            rarity: 'common',
        },
    },
    darkwood: {
        low: null,
        standard: {
            level: 11,
            price: 1400,
            rarity: 'uncommon',
        },
        high: {
            level: 17,
            price: 13500,
            rarity: 'uncommon',
        },
    },
    dragonhide: {
        low: null,
        standard: {
            level: 12,
            price: 1600,
            rarity: 'uncommon',
        },
        high: {
            level: 17,
            price: 32000,
            rarity: 'uncommon',
        },
    },
    mithral: {
        low: null,
        standard: {
            level: 11,
            price: 1400,
            rarity: 'uncommon',
        },
        high: {
            level: 17,
            price: 13500,
            rarity: 'uncommon',
        },
    },
    orichalcum: {
        low: null,
        standard: null,
        high: {
            level: 18,
            price: 22500,
            rarity: 'rare',
        },
    },
    silver: {
        low: {
            level: 2,
            price: 40,
            rarity: 'common',
        },
        standard: {
            level: 10,
            price: 880,
            rarity: 'common',
        },
        high: {
            level: 16,
            price: 9000,
            rarity: 'common',
        },
    },
    sovereignSteel: {
        low: null,
        standard: {
            level: 12,
            price: 1600,
            rarity: 'rare',
        },
        high: {
            level: 19,
            price: 32000,
            rarity: 'rare',
        },
    },
    warpglass: {
        low: null,
        standard: null,
        high: {
            level: 17,
            price: 14000,
            rarity: 'rare',
        },
    },
};
