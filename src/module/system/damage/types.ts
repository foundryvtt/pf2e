import { DAMAGE_CATEGORIES, DAMAGE_DIE_FACES, DAMAGE_TYPES } from "./values";

type DamageCategory = SetElement<typeof DAMAGE_CATEGORIES>;
type DamageDieSize = SetElement<typeof DAMAGE_DIE_FACES>;
type DamageType = SetElement<typeof DAMAGE_TYPES>;

interface DamageCategoryRenderData {
    dice: {
        faces: number;
        result: number;
    }[];
    formula: string;
    label: string;
    total: number;
}

interface DamageTypeRenderData {
    icon: string;
    categories: Record<string, DamageCategoryRenderData>;
    label: string;
}

interface DamageRollRenderData {
    damageTypes: Record<string, DamageTypeRenderData>;
}

export {
    DamageCategory,
    DamageCategoryRenderData,
    DamageDieSize,
    DamageRollRenderData,
    DamageType,
    DamageTypeRenderData,
};
