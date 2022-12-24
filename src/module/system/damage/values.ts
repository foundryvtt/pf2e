import { DamageCategory, DamageType } from "./types";

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
const BASE_DAMAGE_TYPES_TO_CATEGORIES: Readonly<Record<string, DamageCategory>> = {
    // The three default physical damage types.
    bludgeoning: "physical",
    piercing: "physical",
    slashing: "physical",

    // The default energy types.
    acid: "energy",
    cold: "energy",
    electricity: "energy",
    fire: "energy",
    sonic: "energy",
    positive: "energy",
    negative: "energy",
    force: "energy",

    // The default alignment types.
    chaotic: "alignment",
    evil: "alignment",
    good: "alignment",
    lawful: "alignment",
} as const;

const DAMAGE_TYPE_ICONS: Record<DamageType, string | null> = {
    bleed: "droplet",
    acid: "vial",
    bludgeoning: "hammer",
    chaotic: "face-zany",
    cold: "snowflake",
    electricity: "bolt",
    evil: "face-angry-horns",
    fire: "fire",
    force: "sparkles",
    good: "face-smile-halo",
    lawful: "scale-balanced",
    mental: "brain",
    negative: "skull",
    piercing: "bow-arrow",
    poison: "spider",
    positive: "sun",
    slashing: "axe",
    sonic: "waveform-lines",
    untyped: null,
};

export {
    ALIGNMENT_DAMAGE_TYPES,
    BASE_DAMAGE_TYPES_TO_CATEGORIES,
    DAMAGE_CATEGORIES,
    DAMAGE_DIE_FACES,
    DAMAGE_DIE_FACES_TUPLE,
    DAMAGE_TYPE_ICONS,
    DAMAGE_TYPES,
    ENERGY_DAMAGE_TYPES,
    PHYSICAL_DAMAGE_TYPES,
};
