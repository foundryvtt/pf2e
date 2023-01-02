import { SkillAbbreviation } from "@actor/creature/data";
import { AbilityString, ImmunityType, ResistanceType, SkillLongForm, WeaknessType } from "@actor/types";
import { immunityTypes, resistanceTypes, weaknessTypes } from "@scripts/config/iwr";

const ABILITY_ABBREVIATIONS = new Set(["str", "dex", "con", "int", "wis", "cha"] as const);

const CREATURE_ACTOR_TYPES = ["character", "npc", "familiar"] as const;

const SAVE_TYPES = ["fortitude", "reflex", "will"] as const;

const CONDITION_SLUGS = new Set([
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

const IMMUNITY_TYPES = new Set(Object.keys(immunityTypes)) as Set<ImmunityType>;

const WEAKNESS_TYPES = new Set(Object.keys(weaknessTypes)) as Set<WeaknessType>;

const RESISTANCE_TYPES = new Set(Object.keys(resistanceTypes)) as Set<ResistanceType>;

const SKILL_ABBREVIATIONS = new Set([
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

const SKILL_DICTIONARY = {
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

const SKILL_LONG_FORMS = new Set(Object.values(SKILL_DICTIONARY));

const SKILL_DICTIONARY_REVERSE = Object.fromEntries(
    Object.entries(SKILL_DICTIONARY).map(([abbrev, value]) => [value, abbrev] as [SkillLongForm, SkillAbbreviation])
);

const DC_SLUGS = new Set(["ac", "perception", ...SAVE_TYPES, ...SKILL_LONG_FORMS] as const);

interface SkillExpanded {
    ability: AbilityString;
    shortform: SkillAbbreviation;
}

const SKILL_EXPANDED: Record<SkillLongForm, SkillExpanded> = {
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

const MOVEMENT_TYPES = ["land", "burrow", "climb", "fly", "swim"] as const;

// For combatibility with the PF2e Animal Companion Compendia module
const ANIMAL_COMPANION_SOURCE_ID = "Compendium.pf2e-animal-companions.AC-Ancestries-and-Class.h6Ybhv5URar01WPk";
const CONSTRUCT_COMPANION_SOURCE_ID = "Compendium.pf2e-animal-companions.AC-Features.OJePkZgnguu5Z8cA";

export {
    ABILITY_ABBREVIATIONS,
    ANIMAL_COMPANION_SOURCE_ID,
    CONDITION_SLUGS,
    CONSTRUCT_COMPANION_SOURCE_ID,
    CREATURE_ACTOR_TYPES,
    DC_SLUGS,
    IMMUNITY_TYPES,
    MOVEMENT_TYPES,
    RESISTANCE_TYPES,
    SAVE_TYPES,
    SKILL_ABBREVIATIONS,
    SKILL_DICTIONARY,
    SKILL_DICTIONARY_REVERSE,
    SKILL_EXPANDED,
    SKILL_LONG_FORMS,
    WEAKNESS_TYPES,
};
