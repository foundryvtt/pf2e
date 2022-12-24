import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers";
import { AttackTarget, StrikeSelf } from "@actor/types";
import { WeaponMaterialEffect } from "@item";
import { RollNotePF2e } from "@module/notes";
import { DegreeOfSuccessString } from "@system/degree-of-success";
import { BaseRollContext } from "@system/rolls";
import { DamageRoll } from "./roll";
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
    sourceType: "attack" | "save";
    outcome?: DegreeOfSuccessString;
    self?: StrikeSelf | null;
    target?: AttackTarget | null;
    options: Set<string>;
    secret?: boolean;
    /** The domains this roll had, for reporting purposes */
    domains?: string[];
}

interface DamageFormulaData {
    base: BasicDamageData;
    dice: DamageDicePF2e[];
    modifiers: ModifierPF2e[];
}

interface ResolvedDamageFormulaData extends DamageFormulaData {
    formula: {
        criticalFailure: null;
        failure: string | null;
        success: string;
        criticalSuccess: string;
    };
}

interface BasicDamageData {
    damageType: DamageType;
    diceNumber: number;
    dieSize: DamageDieSize | null;
    modifier: number;
    category: DamageCategory | null;
}

interface BaseDamageTemplate {
    name: string;
    notes: RollNotePF2e[];
    traits: string[];
    materials: WeaponMaterialEffect[];
}

interface WeaponDamageTemplate extends BaseDamageTemplate {
    damage: ResolvedDamageFormulaData;
}

interface SpellDamageTemplate extends BaseDamageTemplate {
    damage: {
        roll: DamageRoll;
        breakdownTags: string[];
    };
}

type DamageTemplate = WeaponDamageTemplate | SpellDamageTemplate;

export {
    DamageCategory,
    DamageCategoryRenderData,
    DamageDieSize,
    DamageFormulaData,
    DamageRollContext,
    DamageRollRenderData,
    DamageTemplate,
    DamageType,
    DamageTypeRenderData,
    SpellDamageTemplate,
    WeaponDamageTemplate,
};
