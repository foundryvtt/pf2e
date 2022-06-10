import { StrikeSelf, AttackTarget } from "@actor/creature/types";
import { DegreeOfSuccessString } from "@system/degree-of-success";
import { BaseRollContext } from "@system/rolls";

/** The possible standard damage die sizes. */
const dieFacesTuple = ["d4", "d6", "d8", "d10", "d12"] as const;
const DAMAGE_DIE_FACES = new Set(dieFacesTuple);
type DamageDieSize = SetElement<typeof DAMAGE_DIE_FACES>;

function nextDamageDieSize(next: { upgrade: DamageDieSize }): DamageDieSize;
function nextDamageDieSize(next: { downgrade: DamageDieSize }): DamageDieSize;
function nextDamageDieSize(next: { upgrade: DamageDieSize } | { downgrade: DamageDieSize }): DamageDieSize {
    const [faces, direction] = "upgrade" in next ? [next.upgrade, 1] : [next.downgrade, -1];
    return dieFacesTuple[dieFacesTuple.indexOf(faces) + direction] ?? faces;
}

/** Provides constants for typical damage categories, as well as a simple API for adding custom damage types and categories. */
const DamageCategorization = {
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
    fromDamageType: (damageType: string) => BASE_DAMAGE_TYPES_TO_CATEGORIES[damageType] || damageType,

    /** Get a set of all damage categories (both base and custom). */
    allCategories: () => new Set(Object.values(BASE_DAMAGE_TYPES_TO_CATEGORIES)),

    /** Get a set of all of the base rule damage types. */
    baseCategories: () => new Set(Object.values(BASE_DAMAGE_TYPES_TO_CATEGORIES)),

    /** Map a damage category to the set of damage types in it. */
    toDamageTypes: (category: string) => {
        // Get all of the types in the current mappings which map to the given category
        const types = Object.entries(BASE_DAMAGE_TYPES_TO_CATEGORIES)
            .filter(([_key, value]) => value === category)
            .map(([key]) => key);

        // And return as a set to eliminate duplicates.
        return new Set(types);
    },
} as const;

/** Maps damage types to their damage category; these are the immutable base mappings used if there is no override. */
const BASE_DAMAGE_TYPES_TO_CATEGORIES: Readonly<Record<string, string>> = {
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

interface DamageRollContext extends BaseRollContext {
    type: "damage-roll";
    outcome?: DegreeOfSuccessString;
    self?: StrikeSelf | null;
    target?: AttackTarget | null;
    options: string[];
    secret?: boolean;
}

export {
    BASE_DAMAGE_TYPES_TO_CATEGORIES,
    DAMAGE_DIE_FACES,
    DamageCategorization,
    DamageDieSize,
    DamageRollContext,
    nextDamageDieSize,
};
