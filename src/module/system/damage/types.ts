import { AttackTarget, StrikeSelf } from "@actor/types";
import { DegreeOfSuccessString } from "@system/degree-of-success";
import { BaseRollContext } from "@system/rolls";
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

interface DamageRollContext extends BaseRollContext {
    type: "damage-roll";
    outcome?: DegreeOfSuccessString;
    self?: StrikeSelf | null;
    target?: AttackTarget | null;
    options: Set<string>;
    secret?: boolean;
    /** The domains this roll had, for reporting purposes */
    domains?: string[];
}

export {
    DamageCategory,
    DamageCategoryRenderData,
    DamageDieSize,
    DamageRollContext,
    DamageRollRenderData,
    DamageType,
    DamageTypeRenderData,
};
