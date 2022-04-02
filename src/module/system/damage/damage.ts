import { StrikeSelf, AttackTarget } from "@actor/creature/types";
import { DegreeOfSuccessString } from "@system/degree-of-success";
import { BaseRollContext } from "@system/rolls";
import { combineObjects } from "@util";

/** The possible standard damage die sizes. */
export const DAMAGE_DIE_FACES = new Set(["d4", "d6", "d8", "d10", "d12"] as const);
export type DamageDieSize = SetElement<typeof DAMAGE_DIE_FACES>;

export function nextDamageDieSize(dieSize: DamageDieSize) {
    switch (dieSize) {
        case "d4":
            return "d6";
        case "d6":
            return "d8";
        case "d8":
            return "d10";
        case "d10":
            return "d12";
        case "d12":
            return "d12";
    }
}

/** Provides constants for typical damage categories, as well as a simple API for adding custom damage types and categories. */
export const DamageCategorization = {
    /**
     * Physical damage; one of bludgeoning, piercing, or slashing, and usually caused by a physical object hitting you.
     */
    PHYSICAL: "physical",
    /**
     * Energy damage; one of acid, cold, electricity, fire, or sonic. Generally caused by either magic or strong natural
     * phenomena (like storms, harsh weather, etc).
     */
    ENERGY: "energy",
    /**
     * Alignment damage; one of chaotic, evil, good, or lawful. Generally caused by special magic weapons and by some
     * extraplanar creatures.
     */
    ALIGNMENT: "alignment",

    /**
     * Map a damage type to it's corresponding damage category. If the type has no category, the type itself will be
     * returned.
     */
    fromDamageType: (damageType: string) =>
        CUSTOM_DAMAGE_TYPES_TO_CATEGORIES[damageType] || BASE_DAMAGE_TYPES_TO_CATEGORIES[damageType] || damageType,

    /** Adds a custom damage type -> category mapping. This method can be used to override base damage type/category mappings. */
    addCustomDamageType: (category: string, type: string) => {
        CUSTOM_DAMAGE_TYPES_TO_CATEGORIES[type] = category;
    },

    /** Removes the custom mapping for the given type. */
    removeCustomDamageType: (type: string) => delete CUSTOM_DAMAGE_TYPES_TO_CATEGORIES[type],

    /** Get a set of all damage categories (both base and custom). */
    allCategories: () =>
        new Set(
            Object.values(BASE_DAMAGE_TYPES_TO_CATEGORIES).concat(Object.values(CUSTOM_DAMAGE_TYPES_TO_CATEGORIES))
        ),

    /** Get a set of all of the base rule damage types. */
    baseCategories: () => new Set(Object.values(BASE_DAMAGE_TYPES_TO_CATEGORIES)),

    /** Get a set of all custom damage categories (exluding the base damage types). */
    customCategories: () => {
        const result = new Set(Object.values(CUSTOM_DAMAGE_TYPES_TO_CATEGORIES));
        for (const base of DamageCategorization.baseCategories()) result.delete(base);

        return result;
    },

    /** Get the full current map of damage types -> their current damage category (taking custom mappings into account). */
    currentTypeMappings: () =>
        combineObjects(BASE_DAMAGE_TYPES_TO_CATEGORIES, CUSTOM_DAMAGE_TYPES_TO_CATEGORIES, (_first, second) => second),

    /** Map a damage category to the set of damage types in it. */
    toDamageTypes: (category: string) => {
        // Get all of the types in the current mappings which map to the given category
        const types = Object.entries(DamageCategorization.currentTypeMappings())
            .filter(([_key, value]) => value === category)
            .map(([key]) => key);

        // And return as a set to eliminate duplicates.
        return new Set(types);
    },

    /** Clear all custom damage type mappings. */
    clearCustom: () =>
        Object.keys(CUSTOM_DAMAGE_TYPES_TO_CATEGORIES).forEach((key) => {
            delete CUSTOM_DAMAGE_TYPES_TO_CATEGORIES[key];
        }),
} as const;

/** Maps damage types to their damage category; these are the immutable base mappings used if there is no override. */
export const BASE_DAMAGE_TYPES_TO_CATEGORIES: Readonly<Record<string, string>> = {
    // The three default physical damage types.
    bludgeoning: DamageCategorization.PHYSICAL,
    piercing: DamageCategorization.PHYSICAL,
    slashing: DamageCategorization.PHYSICAL,

    // The default energy types.
    acid: DamageCategorization.ENERGY,
    cold: DamageCategorization.ENERGY,
    electricity: DamageCategorization.ENERGY,
    fire: DamageCategorization.ENERGY,
    sonic: DamageCategorization.ENERGY,
    positive: DamageCategorization.ENERGY,
    negative: DamageCategorization.ENERGY,
    force: DamageCategorization.ENERGY,

    // The default alignment types.
    chaotic: DamageCategorization.ALIGNMENT,
    evil: DamageCategorization.ALIGNMENT,
    good: DamageCategorization.ALIGNMENT,
    lawful: DamageCategorization.ALIGNMENT,
} as const;

/** Custom damage type mappings; maps damage types to their damage category. */
export const CUSTOM_DAMAGE_TYPES_TO_CATEGORIES: Record<string, string> = {};

interface DamageRollContext extends BaseRollContext {
    type: "damage-roll";
    outcome?: DegreeOfSuccessString;
    self?: StrikeSelf | null;
    target?: AttackTarget | null;
    options: string[];
    secret?: boolean;
}

export { DamageRollContext };
