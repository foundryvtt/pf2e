import { SkillAbbreviation } from "@actor/creature/data";
import { AbilityString, SkillLongForm } from "@actor/types";
import { MAGIC_SCHOOLS } from "@item/spell/values";
import { DAMAGE_CATEGORIES, DAMAGE_TYPES } from "@system/damage/values";
import { ATTACK_TYPES, DAMAGE_TRAITS } from "@system/damage/calculation";

export const ABILITY_ABBREVIATIONS = new Set(["str", "dex", "con", "int", "wis", "cha"] as const);

export const CREATURE_ACTOR_TYPES = ["character", "npc", "familiar"] as const;

export const SAVE_TYPES = ["fortitude", "reflex", "will"] as const;

export const CONDITION_SLUGS = new Set([
    "blinded",
    "broken",
    "clumsy",
    "concealed",
    "confused",
    "controlled",
    "dazzled",
    "deafened",
    "doomed",
    "drained",
    "dying",
    "encumbered",
    "enfeebled",
    "fascinated",
    "fatigued",
    "flat-footed",
    "fleeing",
    "friendly",
    "frightened",
    "grabbed",
    "helpful",
    "hidden",
    "hostile",
    "immobilized",
    "indifferent",
    "invisible",
    "observed",
    "paralyzed",
    "persistent-damage",
    "petrified",
    "prone",
    "quickened",
    "restrained",
    "sickened",
    "slowed",
    "stunned",
    "stupefied",
    "unconscious",
    "undetected",
    "unfriendly",
    "unnoticed",
    "wounded",
] as const);

export const IMMUNITY_TYPES = new Set([
    ...CONDITION_SLUGS,
    ...DAMAGE_CATEGORIES,
    ...DAMAGE_TRAITS,
    ...DAMAGE_TYPES,
    ...MAGIC_SCHOOLS,
    "area-damage",
    "auditory",
    "confusion",
    "critical-hits",
    "curse",
    "detection",
    "death-effects",
    "disease",
    "emotion",
    "fear-effects",
    "healing",
    "inhaled",
    "magic",
    "misfortune-effects",
    "nonlethal-attacks",
    "nonmagical-attacks",
    "object-immunities",
    "olfactory",
    "polymorph",
    "possession",
    "precision",
    "scrying",
    "sleep",
    "spellDeflection",
    "swarm-attacks",
    "swarm-mind",
    "trip",
    "visual",
] as const);

export const WEAKNESS_TYPES = new Set([
    ...ATTACK_TYPES,
    ...DAMAGE_CATEGORIES,
    ...DAMAGE_TRAITS,
    ...DAMAGE_TYPES,
    "area-damage",
    "arrow",
    "axe",
    "critical-hits",
    "emotion",
    "precision",
    "splash-damage",
    "vampire-weaknesses",
    "vorpal",
    "vorpal-fear",
    "vulnerable-to-sunlight",
] as const);

export const RESISTANCE_TYPES = new Set([
    ...ATTACK_TYPES,
    ...DAMAGE_TRAITS,
    ...DAMAGE_TYPES,
    ...DAMAGE_CATEGORIES,
    "all",
    "area-damage",
    "critical-hits",
    "protean anatomy",
] as const);

export const SKILL_ABBREVIATIONS = new Set([
    "acr",
    "arc",
    "ath",
    "cra",
    "dec",
    "dip",
    "itm",
    "med",
    "nat",
    "occ",
    "prf",
    "rel",
    "soc",
    "ste",
    "sur",
    "thi",
] as const);

export const SKILL_DICTIONARY = {
    acr: "acrobatics",
    arc: "arcana",
    ath: "athletics",
    cra: "crafting",
    dec: "deception",
    dip: "diplomacy",
    itm: "intimidation",
    med: "medicine",
    nat: "nature",
    occ: "occultism",
    prf: "performance",
    rel: "religion",
    soc: "society",
    ste: "stealth",
    sur: "survival",
    thi: "thievery",
} as const;
export const SKILL_LONG_FORMS = new Set(Object.values(SKILL_DICTIONARY));

export const SKILL_DICTIONARY_REVERSE = Object.fromEntries(
    Object.entries(SKILL_DICTIONARY).map(([abbrev, value]) => [value, abbrev] as [SkillLongForm, SkillAbbreviation])
);

export const DC_SLUGS = new Set(["ac", "perception", ...SAVE_TYPES, ...SKILL_LONG_FORMS] as const);

interface SkillExpanded {
    ability: AbilityString;
    shortform: SkillAbbreviation;
}

export const SKILL_EXPANDED: Record<SkillLongForm, SkillExpanded> = {
    acrobatics: { ability: "dex", shortform: "acr" },
    arcana: { ability: "int", shortform: "arc" },
    athletics: { ability: "str", shortform: "ath" },
    crafting: { ability: "int", shortform: "cra" },
    deception: { ability: "cha", shortform: "dec" },
    diplomacy: { ability: "cha", shortform: "dip" },
    intimidation: { ability: "cha", shortform: "itm" },
    medicine: { ability: "wis", shortform: "med" },
    nature: { ability: "wis", shortform: "nat" },
    occultism: { ability: "int", shortform: "occ" },
    performance: { ability: "cha", shortform: "prf" },
    religion: { ability: "wis", shortform: "rel" },
    society: { ability: "int", shortform: "soc" },
    stealth: { ability: "dex", shortform: "ste" },
    survival: { ability: "wis", shortform: "sur" },
    thievery: { ability: "dex", shortform: "thi" },
};

export const MOVEMENT_TYPES = ["land", "burrow", "climb", "fly", "swim"] as const;
