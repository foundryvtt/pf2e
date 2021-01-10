/* eslint-disable no-use-before-define */
import { combineObjects } from '../../utils';

/** The possible standard damage die sizes. */
export type DamageDieSize = 'd4' | 'd6' | 'd8' | 'd10' | 'd12';

/** Provides constants for typical damage categories, as well as a simple API for adding custom damage types and categories. */
export const DamageCategory = Object.freeze({
    /**
     * Physical damage; one of bludgeoning, piercing, or slashing, and usually caused by a physical object hitting you.
     */
    PHYSICAL: 'physical',
    /**
     * Energy damage; one of acid, cold, electricity, fire, or sonic. Generally caused by either magic or strong natural
     * phenomena (like storms, harsh weather, etc).
     */
    ENERGY: 'energy',
    /**
     * Alignment damage; one of chaotic, evil, good, or lawful. Generally caused by special magic weapons and by some
     * extraplanar creatures.
     */
    ALIGNMENT: 'alignment',

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
            []
                .concat(Object.values(BASE_DAMAGE_TYPES_TO_CATEGORIES))
                .concat(Object.values(CUSTOM_DAMAGE_TYPES_TO_CATEGORIES)),
        ),

    /** Get a set of all of the base rule damage types. */
    baseCategories: () => new Set(Object.values(BASE_DAMAGE_TYPES_TO_CATEGORIES)),

    /** Get a set of all custom damage categories (exluding the base damage types). */
    customCategories: () => {
        const result = new Set(Object.values(CUSTOM_DAMAGE_TYPES_TO_CATEGORIES));
        for (const base of DamageCategory.baseCategories()) result.delete(base);

        return result;
    },

    /** Get the full current map of damage types -> their current damage category (taking custom mappings into account). */
    currentTypeMappings: () =>
        combineObjects(BASE_DAMAGE_TYPES_TO_CATEGORIES, CUSTOM_DAMAGE_TYPES_TO_CATEGORIES, (first, second) => second),

    /** Map a damage category to the set of damage types in it. */
    toDamageTypes: (category: string) => {
        // Get all of the types in the current mappings which map to the given category
        const types = Object.entries(DamageCategory.currentTypeMappings())
            .filter(([key, value]) => value === category)
            .map(([key, value]) => key);

        // And return as a set to eliminate duplicates.
        return new Set(types);
    },

    /** Clear all custom damage type mappings. */
    clearCustom: () =>
        Object.keys(CUSTOM_DAMAGE_TYPES_TO_CATEGORIES).forEach((key) => {
            delete CUSTOM_DAMAGE_TYPES_TO_CATEGORIES[key];
        }),
});

/** Maps damage types to their damage category; these are the immutable base mappings used if there is no override. */
export const BASE_DAMAGE_TYPES_TO_CATEGORIES: Readonly<Record<string, string>> = Object.freeze({
    // The three default physical damage types.
    bludgeoning: DamageCategory.PHYSICAL,
    piercing: DamageCategory.PHYSICAL,
    slashing: DamageCategory.PHYSICAL,

    // The default energy types.
    acid: DamageCategory.ENERGY,
    cold: DamageCategory.ENERGY,
    electricity: DamageCategory.ENERGY,
    fire: DamageCategory.ENERGY,
    sonic: DamageCategory.ENERGY,
    positive: DamageCategory.ENERGY,
    negative: DamageCategory.ENERGY,
    force: DamageCategory.ENERGY,

    // The default alignment types.
    chaotic: DamageCategory.ALIGNMENT,
    evil: DamageCategory.ALIGNMENT,
    good: DamageCategory.ALIGNMENT,
    lawful: DamageCategory.ALIGNMENT,
});

/** Custom damage type mappings; maps damage types to their damage category. */
export const CUSTOM_DAMAGE_TYPES_TO_CATEGORIES: Record<string, string> = {};
