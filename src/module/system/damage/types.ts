import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers.ts";
import { ResistanceType, RollTarget, StrikeSelf } from "@actor/types.ts";
import { ZeroToTwo } from "@module/data.ts";
import { DegreeOfSuccessString } from "@system/degree-of-success.ts";
import { BaseRollContext } from "@system/rolls.ts";
import { DamageRoll } from "./roll.ts";
import { DAMAGE_CATEGORIES_UNIQUE, DAMAGE_DIE_FACES, DAMAGE_TYPES } from "./values.ts";

type DamageCategoryUnique = SetElement<typeof DAMAGE_CATEGORIES_UNIQUE>;
type DamageCategory = keyof typeof CONFIG.PF2E.damageCategories;
type DamageDieSize = SetElement<typeof DAMAGE_DIE_FACES>;
type DamageType = SetElement<typeof DAMAGE_TYPES>;
type MaterialDamageEffect = keyof typeof CONFIG.PF2E.materialDamageEffects;

/**
 * `null`: double on crit (includes most damage)
 * `true`: critical only, don't double
 * `false`: don't double on crit
 */
type CriticalInclusion = boolean | null;

type DamageKind = "damage" | "healing";

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
    sourceType: "attack" | "check" | "save";
    outcome?: DegreeOfSuccessString | null;
    self?: StrikeSelf | null;
    target?: RollTarget | null;
    options: Set<string>;
    secret?: boolean;
    /** The domains this roll had, for reporting purposes */
    domains?: string[];
    /** The number of MAP increases from the preceding check */
    mapIncreases?: ZeroToTwo;
}

interface DamageFormulaData {
    base: BaseDamageData[];
    dice: DamageDicePF2e[];
    modifiers: ModifierPF2e[];
    /** Maximum number of die increases. Weapons should be set to 1 */
    maxIncreases?: number;
    ignoredResistances: { type: ResistanceType; max: number | null }[];
    kinds?: Set<DamageKind>;
}

interface ResolvedDamageFormulaData extends DamageFormulaData {
    formula: Record<DegreeOfSuccessString, string | null>;
    breakdown: Record<DegreeOfSuccessString, string[]>;
}

interface DamagePartialTerm {
    /** The static amount of damage of the current damage type and category. */
    modifier: number;
    /** Maps the die face ("d4", "d6", "d8", "d10", "d12") to the number of dice of that type. */
    dice: { number: number; faces: number } | null;
}

interface BaseDamageData {
    terms?: DamagePartialTerm[];
    damageType: DamageType;
    diceNumber?: number;
    dieSize?: DamageDieSize | null;
    modifier?: number;
    category: DamageCategoryUnique | null;
    materials?: MaterialDamageEffect[];
}

interface WeaponBaseDamageData extends BaseDamageData {
    terms?: never;
}

interface BaseDamageTemplate {
    name: string;
    traits: string[];
    materials: MaterialDamageEffect[];
    modifiers?: (ModifierPF2e | DamageDicePF2e)[];
}

interface WeaponDamageTemplate extends BaseDamageTemplate {
    damage: ResolvedDamageFormulaData;
}

interface SpellDamageTemplate extends BaseDamageTemplate {
    damage: {
        roll: DamageRoll;
        breakdown: string[];
    };
}

type AfflictionDamageTemplate = SpellDamageTemplate;
type SimpleDamageTemplate = SpellDamageTemplate;

type DamageTemplate = WeaponDamageTemplate | SpellDamageTemplate | AfflictionDamageTemplate | SimpleDamageTemplate;

export type {
    AfflictionDamageTemplate,
    BaseDamageData,
    CriticalInclusion,
    DamageCategory,
    DamageCategoryRenderData,
    DamageCategoryUnique,
    DamageDieSize,
    DamageFormulaData,
    DamageKind,
    DamagePartialTerm,
    DamageRollContext,
    DamageRollRenderData,
    DamageTemplate,
    DamageType,
    DamageTypeRenderData,
    MaterialDamageEffect,
    SimpleDamageTemplate,
    SpellDamageTemplate,
    WeaponBaseDamageData,
    WeaponDamageTemplate,
};
