import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers";
import { AttackTarget, ResistanceType, StrikeSelf } from "@actor/types";
import { RollNotePF2e } from "@module/notes";
import { DegreeOfSuccessString } from "@system/degree-of-success";
import { BaseRollContext } from "@system/rolls";
import { DamageRoll } from "./roll";
import { DAMAGE_CATEGORIES_UNIQUE, DAMAGE_DIE_FACES, DAMAGE_TYPES } from "./values";

type DamageCategoryUnique = SetElement<typeof DAMAGE_CATEGORIES_UNIQUE>;
type MaterialDamageEffect = keyof ConfigPF2e["PF2E"]["materialDamageEffects"];
type DamageCategory = keyof ConfigPF2e["PF2E"]["damageCategories"];
type DamageDieSize = SetElement<typeof DAMAGE_DIE_FACES>;
type DamageType = SetElement<typeof DAMAGE_TYPES>;

/**
 * `null`: double on crit (includes most damage)
 * `true`: critical only, don't double
 * `false`: don't double on crit
 */
type CriticalInclusion = boolean | null;

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
    ignoredResistances: { type: ResistanceType; max: number | null }[];
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
    materials?: MaterialDamageEffect[];
}

interface BaseDamageTemplate {
    name: string;
    notes: RollNotePF2e[];
    traits: string[];
    materials: MaterialDamageEffect[];
    modifiers?: (ModifierPF2e | DamageDicePF2e)[];
}

interface WeaponDamageTemplate extends BaseDamageTemplate {
    damage: ResolvedDamageFormulaData;
    domains: string[];
}

interface SpellDamageTemplate extends BaseDamageTemplate {
    damage: {
        roll: DamageRoll;
        breakdownTags: string[];
    };
}

type DamageTemplate = WeaponDamageTemplate | SpellDamageTemplate;

export {
    CriticalInclusion,
    DamageCategory,
    DamageCategoryRenderData,
    DamageCategoryUnique,
    DamageDieSize,
    DamageFormulaData,
    DamageRollContext,
    DamageRollRenderData,
    DamageTemplate,
    DamageType,
    DamageTypeRenderData,
    MaterialDamageEffect,
    SpellDamageTemplate,
    WeaponDamageTemplate,
};
