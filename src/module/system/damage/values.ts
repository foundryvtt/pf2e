import type { ImageFilePath } from "@common/constants.d.mts";
import { DamageCategory, DamageType } from "./types.ts";

const PHYSICAL_DAMAGE_TYPES = ["bludgeoning", "piercing", "slashing", "bleed"] as const;
const LIFE_ENERGY_DAMAGE_TYPES = ["vitality", "void"] as const;
const ENERGY_DAMAGE_TYPES = [
    "acid",
    "cold",
    "electricity",
    "fire",
    "sonic",
    "force",
    ...LIFE_ENERGY_DAMAGE_TYPES,
] as const;

/** A set of mutually exclusive damage categories */
const DAMAGE_CATEGORIES_UNIQUE = ["persistent", "precision", "splash"] as const;

/** All damage modifications that only affect IWR (like materials) */
const MATERIAL_DAMAGE_EFFECTS = new Set([
    "adamantine",
    "cold-iron",
    "dawnsilver",
    "duskwood",
    "orichalcum",
    "silver",
    "sisterstone-dusk",
    "sisterstone-scarlet",
    "warpglass",
] as const);

const DAMAGE_CATEGORIES = new Set([
    ...DAMAGE_CATEGORIES_UNIQUE,
    ...MATERIAL_DAMAGE_EFFECTS,
    "energy",
    "physical",
] as const);

/** The standard damage die sizes (number of faces on a die) */
const DAMAGE_DIE_SIZES = ["d4", "d6", "d8", "d10", "d12"] as const;
const DAMAGE_DICE_FACES = [4, 6, 8, 10, 12] as const;

const DAMAGE_TYPES = new Set([
    ...PHYSICAL_DAMAGE_TYPES,
    ...ENERGY_DAMAGE_TYPES,
    "mental",
    "poison",
    "spirit",
    "untyped", // see https://2e.aonprd.com/Spells.aspx?ID=162
] as const);

/** Maps damage types to their damage category; these are the immutable base mappings used if there is no override. */
const BASE_DAMAGE_TYPES_TO_CATEGORIES: Record<DamageType, DamageCategory | null> = {
    bludgeoning: "physical",
    piercing: "physical",
    slashing: "physical",
    bleed: "physical",

    acid: "energy",
    cold: "energy",
    electricity: "energy",
    fire: "energy",
    sonic: "energy",
    vitality: "energy",
    void: "energy",
    force: "energy",

    mental: null,
    poison: null,
    spirit: null,
    untyped: null,
} as const;

const DAMAGE_TYPE_ICONS: Record<DamageType, string | null> = {
    bleed: "droplet",
    acid: "vial",
    bludgeoning: "hammer",
    cold: "snowflake",
    electricity: "bolt",
    fire: "fire",
    force: "sparkles",
    mental: "brain",
    piercing: "bow-arrow",
    poison: "spider",
    slashing: "axe",
    sonic: "waveform-lines",
    spirit: "ghost",
    vitality: "sun",
    void: "skull",
    untyped: null,
};

/** Image map for conditions, currently placed here until we get a new set */
const PERSISTENT_DAMAGE_IMAGES: Partial<Record<DamageType, ImageFilePath>> = {
    acid: "icons/magic/acid/dissolve-arm-flesh.webp",
    bludgeoning: `${SYSTEM_ROOT}/icons/equipment/weapons/bola.webp`,
    cold: "icons/magic/water/ice-snowman.webp",
    electricity: `${SYSTEM_ROOT}/icons/spells/chain-lightning.webp`,
    fire: "icons/magic/fire/flame-burning-creature-skeleton.webp",
    force: `${SYSTEM_ROOT}/icons/spells/magic-missile.webp`,
    mental: `${SYSTEM_ROOT}/icons/spells/modify-memory.webp`,
    piercing: `${SYSTEM_ROOT}/icons/equipment/weapons/throwing-knife.webp`,
    poison: `${SYSTEM_ROOT}/icons/spells/acidic-burst.webp`,
    slashing: `${SYSTEM_ROOT}/icons/equipment/weapons/scimitar.webp`,
    sonic: `${SYSTEM_ROOT}/icons/spells/cry-of-destruction.webp`,
    spirit: "icons/magic/unholy/hand-claw-fire-blue.webp",
    vitality: `${SYSTEM_ROOT}/icons/spells/moment-of-renewal.webp`,
    void: `${SYSTEM_ROOT}/icons/spells/grim-tendrils.webp`,
};

/** Whether and how damage should be included on a critical hit */
const CRITICAL_INCLUSION = {
    DOUBLE_ON_CRIT: null,
    CRITICAL_ONLY: true,
    DONT_DOUBLE_ON_CRIT: false,
};

export {
    BASE_DAMAGE_TYPES_TO_CATEGORIES,
    CRITICAL_INCLUSION,
    DAMAGE_CATEGORIES,
    DAMAGE_CATEGORIES_UNIQUE,
    DAMAGE_DICE_FACES,
    DAMAGE_DIE_SIZES,
    DAMAGE_TYPE_ICONS,
    DAMAGE_TYPES,
    ENERGY_DAMAGE_TYPES,
    MATERIAL_DAMAGE_EFFECTS,
    PERSISTENT_DAMAGE_IMAGES,
    PHYSICAL_DAMAGE_TYPES,
};
