import { DamageCategorization } from "./damage";

const PHYSICAL_DAMAGE_TYPES = ["bludgeoning", "piercing", "slashing", "bleed"] as const;
const LIFE_ENERGY_DAMAGE_TYPES = ["positive", "negative"] as const;
const ENERGY_DAMAGE_TYPES = [
    "acid",
    "cold",
    "electricity",
    "fire",
    "sonic",
    "force",
    ...LIFE_ENERGY_DAMAGE_TYPES,
] as const;
const ALIGNMENT_DAMAGE_TYPES = ["chaotic", "lawful", "good", "evil"] as const;

const DAMAGE_CATEGORIES = new Set([
    "adamantine",
    "alignment",
    "coldiron",
    "darkwood",
    "energy",
    "ghostTouch",
    "mithral",
    "orichalcum",
    "physical",
    "precision",
    "salt",
    "salt-water",
    "silver",
    "sisterstone-dusk",
    "sisterstone-scarlet",
    "warpglass",
] as const);

/** The standard damage die sizes */
const DAMAGE_DIE_FACES_TUPLE = ["d4", "d6", "d8", "d10", "d12"] as const;
const DAMAGE_DIE_FACES = new Set(DAMAGE_DIE_FACES_TUPLE);

const DAMAGE_TYPES = new Set([
    ...PHYSICAL_DAMAGE_TYPES,
    ...ENERGY_DAMAGE_TYPES,
    ...ALIGNMENT_DAMAGE_TYPES,
    "mental",
    "poison",
    "untyped", // see https://2e.aonprd.com/Spells.aspx?ID=162
] as const);

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

export {
    ALIGNMENT_DAMAGE_TYPES,
    BASE_DAMAGE_TYPES_TO_CATEGORIES,
    DAMAGE_CATEGORIES,
    DAMAGE_DIE_FACES,
    DAMAGE_DIE_FACES_TUPLE,
    DAMAGE_TYPES,
    ENERGY_DAMAGE_TYPES,
    PHYSICAL_DAMAGE_TYPES,
};
