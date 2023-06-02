import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers.ts";
import { RollTarget, ResistanceType, StrikeSelf } from "@actor/types.ts";
import { ZeroToTwo } from "@module/data.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { DegreeOfSuccessString } from "@system/degree-of-success.ts";
import { BaseRollContext } from "@system/rolls.ts";
import { DamageRoll } from "./roll.ts";
import { DAMAGE_CATEGORIES_UNIQUE, DAMAGE_DIE_FACES, DAMAGE_TYPES } from "./values.ts";

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
    ignoredResistances: { type: ResistanceType; max: number | null }[];
}

interface WeaponDamageFormulaData extends Omit<DamageFormulaData, "base"> {
    base: [WeaponBaseDamageData];
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
        breakdown: string[];
    };
}

type AfflictionDamageTemplate = SpellDamageTemplate;

type DamageTemplate = WeaponDamageTemplate | SpellDamageTemplate | AfflictionDamageTemplate;

export {
    AfflictionDamageTemplate,
    BaseDamageData,
    CriticalInclusion,
    DamageCategory,
    DamageCategoryRenderData,
    DamageCategoryUnique,
    DamageDieSize,
    DamageFormulaData,
    DamagePartialTerm,
    DamageRollContext,
    DamageRollRenderData,
    DamageTemplate,
    DamageType,
    DamageTypeRenderData,
    MaterialDamageEffect,
    SpellDamageTemplate,
    WeaponBaseDamageData,
    WeaponDamageFormulaData,
    WeaponDamageTemplate,
};
