import type { DamageDicePF2e, Modifier } from "@actor/modifiers.ts";
import type { RollOrigin, RollTarget } from "@actor/roll-context/types.ts";
import type { ImmunityType, ResistanceType } from "@actor/types.ts";
import type { ZeroToTwo } from "@module/data.ts";
import type { DegreeOfSuccessString } from "@system/degree-of-success.ts";
import type { BaseRollContext } from "@system/rolls.ts";
import type { DamageRoll } from "./roll.ts";
import type { DAMAGE_CATEGORIES_UNIQUE, DAMAGE_DICE_FACES, DAMAGE_DIE_SIZES, DAMAGE_TYPES } from "./values.ts";

type DamageCategoryUnique = (typeof DAMAGE_CATEGORIES_UNIQUE)[number];
type DamageCategory = keyof typeof CONFIG.PF2E.damageCategories;
type DamageDiceFaces = (typeof DAMAGE_DICE_FACES)[number];
type DamageDieSize = (typeof DAMAGE_DIE_SIZES)[number];
type DamageType = SetElement<typeof DAMAGE_TYPES>;
type DamageKind = "damage" | "healing";
type MaterialDamageEffect = keyof typeof CONFIG.PF2E.materialDamageEffects;

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

interface DamageDamageContext extends BaseRollContext {
    type: "damage-roll";
    sourceType: "attack" | "check" | "save";
    outcome?: DegreeOfSuccessString | null;
    self?: RollOrigin | null;
    target?: RollTarget | null;
    options: Set<string>;
    secret?: boolean;
    /** The domains this roll had, for reporting purposes */
    domains: string[];
    /** The number of MAP increases from the preceding check */
    mapIncreases?: ZeroToTwo;
}

interface DamageFormulaData {
    base: BaseDamageData[];
    dice: DamageDicePF2e[];
    modifiers: Modifier[];
    /** Maximum number of die increases. Weapons should be set to 1 */
    maxIncreases?: number;
    bypass?: DamageIRBypassData;
    kinds?: Set<DamageKind>;
}

/** Data detailing whether and how a damaging effect can reduce or ignore a target's immunities or resistances */
interface DamageIRBypassData {
    immunity: {
        ignore: ImmunityType[];
        downgrade: DowngradedImmunity[];
        redirect: ImmunityRedirect[];
    };
    resistance: {
        ignore: IgnoredResistance[];
        redirect: ResistanceRedirect[];
    };
}

interface DowngradedImmunity {
    type: ImmunityType;
    resistence: number;
}

/** A resistance type to ignore up to a maximum (possibly `Infinity`) */
interface IgnoredResistance {
    type: ResistanceType;
    max: number;
}

/** A damage type to check against instead if the target would resist the actual damage type */
interface ImmunityRedirect {
    from: Exclude<DamageType, "untyped">;
    to: Exclude<DamageType, "untyped">;
}

/** A damage type to check against instead if the target would resist the actual damage type */
interface ResistanceRedirect {
    from: Exclude<DamageType, "untyped">;
    to: Exclude<DamageType, "untyped">;
}

interface ResolvedDamageFormulaData extends DamageFormulaData {
    roll?: never;
    formula: Record<DegreeOfSuccessString, string | null>;
    breakdown: Record<DegreeOfSuccessString, string[]>;
}

interface DamagePartialTerm {
    /** The static amount of damage of the current damage type and category. */
    modifier: number;
    /** Maps the die face ("d4", "d6", "d8", "d10", "d12") to the number of dice of that type. */
    dice: { number: number; faces: DamageDiceFaces } | null;
}

interface BaseDamageData {
    terms?: DamagePartialTerm[];
    damageType: DamageType;
    diceNumber?: number;
    dieSize?: DamageDieSize | null;
    modifier?: number;
    category: DamageCategoryUnique | null;
    materials?: MaterialDamageEffect[];
    tags?: string[];
}

interface WeaponBaseDamageData extends BaseDamageData {
    terms?: never;
}

interface BaseDamageTemplate {
    name: string;
    materials: MaterialDamageEffect[];
    modifiers?: (Modifier | DamageDicePF2e)[];
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
    DamageDamageContext,
    DamageDiceFaces,
    DamageDieSize,
    DamageFormulaData,
    DamageIRBypassData,
    DamageKind,
    DamagePartialTerm,
    DamageRollRenderData,
    DamageTemplate,
    DamageType,
    DamageTypeRenderData,
    ImmunityRedirect,
    MaterialDamageEffect,
    ResistanceRedirect,
    SimpleDamageTemplate,
    SpellDamageTemplate,
    WeaponBaseDamageData,
    WeaponDamageTemplate,
};
